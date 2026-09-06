import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import type { DestinationStream } from 'pino';
import { ZodError } from 'zod';
import type { Config } from './config.ts';
import type { AppDatabase } from './db/client.ts';
import { openDatabase } from './db/client.ts';
import { runMigrations } from './db/migrate.ts';
import {
  AppError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
  toErrorResponse,
} from './lib/errors.ts';
import authPlugin from './plugins/auth.ts';
import bodyWeightRoutes from './routes/bodyWeight.ts';
import entriesRoutes from './routes/entries.ts';
import exercisesRoutes from './routes/exercises.ts';
import healthRoutes from './routes/health.ts';

declare module 'fastify' {
  interface FastifyInstance {
    db: AppDatabase;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const defaultClientDir = path.join(repoRoot, 'dist', 'client');

function readVersion(): string {
  const pkgPath = path.join(repoRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
  return pkg.version;
}

function getFastify4xxStatusCode(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  ) {
    const statusCode = (error as { statusCode: number }).statusCode;
    if (statusCode >= 400 && statusCode <= 499) {
      return statusCode;
    }
  }
  return undefined;
}

export type BuildAppOptions = {
  config: Config;
  databasePath?: string;
  logStream?: DestinationStream;
  clientDir?: string;
  dbVerbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
};

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const { config } = options;
  const clientDir = options.clientDir ?? defaultClientDir;

  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ['req.headers.cookie', 'req.headers.authorization'],
      ...(options.logStream ? { stream: options.logStream } : {}),
    },
    trustProxy: config.nodeEnv === 'production',
    genReqId: () => randomUUID(),
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

    const fourXxStatusCode = getFastify4xxStatusCode(error);
    if (fourXxStatusCode !== undefined) {
      const mapped = fourXxStatusCode === 429 ? new RateLimitedError() : new ValidationError();
      request.log.warn({ err: error, requestId }, 'Fastify or plugin error');
      reply.status(fourXxStatusCode).send(toErrorResponse(mapped, requestId));
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

    const acceptsHtml = (request.headers.accept ?? '').includes('text/html');
    if (config.nodeEnv === 'production' && request.method === 'GET' && acceptsHtml) {
      reply.type('text/html').sendFile('index.html');
      return;
    }

    reply.status(404).send('Not found');
  });

  if (config.nodeEnv === 'production') {
    app.register(fastifyStatic, { root: clientDir });
  }

  const { sqlite, db } = openDatabase(options.databasePath ?? config.databasePath, {
    verbose: options.dbVerbose,
  });
  runMigrations(db);
  app.decorate('db', db);
  app.addHook('onClose', async () => {
    sqlite.close();
  });

  app.register(healthRoutes, {
    version: readVersion(),
    replicationEnabled: config.litestreamBucket !== undefined,
  });
  app.register(authPlugin, { config });
  app.register(exercisesRoutes);
  app.register(entriesRoutes);
  app.register(bodyWeightRoutes);

  return app;
}
