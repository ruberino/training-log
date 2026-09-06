import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server/app.ts';
import { loadConfig } from '../../src/server/config.ts';

const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  APP_PASSWORD: 'test-password-123',
  SESSION_SECRET: 'test-session-secret-at-least-32-characters',
};

export function createTestApp(envOverrides: Record<string, string> = {}): FastifyInstance {
  const config = loadConfig({ ...TEST_ENV, ...envOverrides });
  return buildApp({ config, databasePath: ':memory:' });
}
