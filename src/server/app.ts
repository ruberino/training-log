import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { Config } from './config.ts';
import { AppError, NotFoundError, ValidationError, toErrorResponse } from './lib/errors.ts';
import healthRoutes from './routes/health.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const clientDistDir = path.join(repoRoot, 'dist', 'client');

function readVersion(): string {
  const pkgPath = path.join(repoRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
  return pkg.version;
}

export type BuildAppOptions = {
  config: Config;
  databasePath?: string;
};

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const { config } = options;

  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ['req.headers.cookie', 'req.headers.authorization'],
    },
    trustProxy: config.nodeEnv === 'production',
  });

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    return payload;
  });

  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof ZodError) {
      const validationError = new ValidationError('Ugyldig forespørsel', error.issues);
      reply.status(validationError.statusCode).send(toErrorResponse(validationError, requestId));
      return;
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error, requestId }, error.message);
      }
      reply.status(error.statusCode).send(toErrorResponse(error, requestId));
      return;
    }

    request.log.error({ err: error, requestId }, 'Unhandled error');
    reply.status(500).send(toErrorResponse(error, requestId));
  });

  app.setNotFoundHandler((request, reply) => {
    const requestId = request.id;

    if (request.url.startsWith('/api/')) {
      const notFound = new NotFoundError();
      reply.status(notFound.statusCode).send(toErrorResponse(notFound, requestId));
      return;
    }

    if (config.nodeEnv === 'production' && request.method === 'GET') {
      reply.type('text/html').sendFile('index.html');
      return;
    }

    reply.status(404).send('Not found');
  });

  if (config.nodeEnv === 'production') {
    app.register(fastifyStatic, { root: clientDistDir });
  }

  app.register(healthRoutes, { version: readVersion() });

  return app;
}
