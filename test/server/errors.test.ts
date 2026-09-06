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
    expect(typeof body.error.message).toBe('string');
    expect(typeof body.error.requestId).toBe('string');
    expect(response.headers['x-request-id']).toBe(body.error.requestId);

    await app.close();
  });

  it('returns a generic INTERNAL shape and logs the real error for an unhandled exception', async () => {
    const app = createTestApp();
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

    await app.close();
  });
});
