import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.ts';
import { loginCookie } from '../helpers/login.ts';

describe('error handling', () => {
  it('returns a NOT_FOUND shape for an unknown API route, with a matching x-request-id', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/nope',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Finnes ikke');
    expect(typeof body.error.requestId).toBe('string');
    expect(response.headers['x-request-id']).toBe(body.error.requestId);

    await app.close();
  });

  it('returns a generic INTERNAL shape and logs the real error for an unhandled exception', async () => {
    const logSink: Record<string, unknown>[] = [];
    const app = createTestApp({ logSink });
    app.get('/api/__boom', async () => {
      throw new Error('boom');
    });
    await app.ready();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/__boom',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).not.toContain('boom');
    expect(JSON.stringify(body)).not.toMatch(/stack/i);
    expect(typeof body.error.requestId).toBe('string');

    const errorLine = logSink.find(
      (line) =>
        line.level === 50 && (line.err as { message?: string } | undefined)?.message === 'boom',
    );
    expect(errorLine).toBeDefined();
    expect(errorLine?.requestId).toBe(body.error.requestId);

    await app.close();
  });

  it('maps a malformed JSON body to 400 VALIDATION_ERROR', async () => {
    const logSink: Record<string, unknown>[] = [];
    const app = createTestApp({ logSink });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{bad json',
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(response.headers['x-request-id']).toBe(body.error.requestId);

    const warnLine = logSink.find((line) => line.level === 40);
    expect(warnLine).toBeDefined();

    await app.close();
  });

  it('maps an unsupported content-type to 415 VALIDATION_ERROR', async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/xml' },
      payload: '<xml/>',
    });

    expect(response.statusCode).toBe(415);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });
});
