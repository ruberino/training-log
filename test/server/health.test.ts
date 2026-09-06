import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.ts';

describe('GET /api/health', () => {
  it('returns ok status and a version string', async () => {
    const app = createTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toEqual({ status: 'ok', version: expect.any(String) });

    await app.close();
  });

  it('gives each request a distinct UUID request id', async () => {
    const app = createTestApp();

    const first = await app.inject({ method: 'GET', url: '/api/health' });
    const second = await app.inject({ method: 'GET', url: '/api/health' });

    const uuidPattern = /^[0-9a-f-]{36}$/;
    expect(first.headers['x-request-id']).toMatch(uuidPattern);
    expect(second.headers['x-request-id']).toMatch(uuidPattern);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);

    await app.close();
  });
});
