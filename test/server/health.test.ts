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
});
