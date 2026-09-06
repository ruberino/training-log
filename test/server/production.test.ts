import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.ts';
import { loginCookie } from '../helpers/login.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureClientDir = path.resolve(here, '..', 'fixtures', 'client');

function createProductionApp() {
  return createTestApp({ env: { NODE_ENV: 'production' }, clientDir: fixtureClientDir });
}

describe('production static serving', () => {
  it('serves the SPA fixture for an HTML navigation to /', async () => {
    const app = createProductionApp();

    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { accept: 'text/html' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Treningslogg test fixture');

    await app.close();
  });

  it('serves the SPA fixture for a deep link HTML navigation', async () => {
    const app = createProductionApp();

    const response = await app.inject({
      method: 'GET',
      url: '/exercises/12',
      headers: { accept: 'text/html' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Treningslogg test fixture');

    await app.close();
  });

  it('gives 404 for a missing asset instead of the SPA fallback', async () => {
    const app = createProductionApp();

    const response = await app.inject({ method: 'GET', url: '/assets/missing.js' });

    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain('Treningslogg test fixture');

    await app.close();
  });

  it('serves manifest.webmanifest with the manifest content type', async () => {
    const app = createProductionApp();

    const response = await app.inject({ method: 'GET', url: '/manifest.webmanifest' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/manifest+json');

    await app.close();
  });

  it('still returns the JSON NOT_FOUND shape for an unknown API route', async () => {
    const app = createProductionApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/nope',
      headers: { cookie, accept: 'text/html' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');

    await app.close();
  });
});
