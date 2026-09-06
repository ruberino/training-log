import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/server/config.ts';

const validEnv = {
  APP_PASSWORD: 'a-valid-password',
  SESSION_SECRET: 'a-session-secret-that-is-at-least-32-chars',
};

describe('loadConfig', () => {
  it('parses a minimal valid environment and fills in the documented defaults', () => {
    const config = loadConfig(validEnv);

    expect(config).toEqual({
      nodeEnv: 'development',
      port: 3000,
      host: '0.0.0.0',
      databasePath: './data/training-log.db',
      appPassword: validEnv.APP_PASSWORD,
      sessionSecret: validEnv.SESSION_SECRET,
      logLevel: 'info',
      tz: 'Europe/Oslo',
    });
  });

  it('applies every override from the environment', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      PORT: '8080',
      HOST: '127.0.0.1',
      DATABASE_PATH: '/data/training-log.db',
      LOG_LEVEL: 'debug',
      TZ: 'UTC',
    });

    expect(config.nodeEnv).toBe('production');
    expect(config.port).toBe(8080);
    expect(config.host).toBe('127.0.0.1');
    expect(config.databasePath).toBe('/data/training-log.db');
    expect(config.logLevel).toBe('debug');
    expect(config.tz).toBe('UTC');
  });

  it('throws naming the variable when APP_PASSWORD is missing', () => {
    expect(() => loadConfig({ SESSION_SECRET: validEnv.SESSION_SECRET })).toThrow(/APP_PASSWORD/);
  });

  it('throws naming the variable when APP_PASSWORD is too short', () => {
    expect(() => loadConfig({ ...validEnv, APP_PASSWORD: 'short' })).toThrow(/APP_PASSWORD/);
  });

  it('throws naming the variable when SESSION_SECRET is missing', () => {
    expect(() => loadConfig({ APP_PASSWORD: validEnv.APP_PASSWORD })).toThrow(/SESSION_SECRET/);
  });

  it('throws naming the variable when SESSION_SECRET is too short', () => {
    expect(() => loadConfig({ ...validEnv, SESSION_SECRET: 'too-short' })).toThrow(
      /SESSION_SECRET/,
    );
  });
});
