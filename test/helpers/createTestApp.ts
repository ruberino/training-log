import { Writable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server/app.ts';
import { loadConfig } from '../../src/server/config.ts';

const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  APP_PASSWORD: 'test-password-123',
  SESSION_SECRET: 'test-session-secret-at-least-32-characters',
};

export type CreateTestAppOptions = {
  env?: Record<string, string>;
  logSink?: object[];
};

function createLogStream(logSink?: object[]): Writable {
  let buffer = '';
  return new Writable({
    write(chunk: Buffer, _encoding, callback) {
      buffer += chunk.toString('utf-8');
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (logSink && line.length > 0) {
          logSink.push(JSON.parse(line));
        }
        newlineIndex = buffer.indexOf('\n');
      }
      callback();
    },
  });
}

export function createTestApp(options: CreateTestAppOptions = {}): FastifyInstance {
  const config = loadConfig({ ...TEST_ENV, ...options.env });
  return buildApp({
    config,
    databasePath: ':memory:',
    logStream: createLogStream(options.logSink),
  });
}
