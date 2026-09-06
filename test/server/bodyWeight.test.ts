import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.ts';
import { loginCookie } from '../helpers/login.ts';

function putBodyWeight(
  app: ReturnType<typeof createTestApp>,
  cookie: string,
  date: string,
  body: Record<string, unknown>,
) {
  return app.inject({
    method: 'PUT',
    url: `/api/body-weight/${date}`,
    headers: { cookie },
    payload: body,
  });
}

describe('GET /api/body-weight', () => {
  it('requires the auth cookie', async () => {
    const app = createTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/body-weight' });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns an empty list when nothing has been registered', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/body-weight',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);

    await app.close();
  });

  it('orders entries by date descending', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 80 });
    await putBodyWeight(app, cookie, '2026-01-10', { weightKg: 81 });
    await putBodyWeight(app, cookie, '2026-01-05', { weightKg: 80.5 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/body-weight',
      headers: { cookie },
    });

    expect(response.json().map((row: { date: string }) => row.date)).toEqual([
      '2026-01-10',
      '2026-01-05',
      '2026-01-01',
    ]);

    await app.close();
  });
});

describe('PUT /api/body-weight/:date', () => {
  it('requires the auth cookie', async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/body-weight/2026-01-01',
      payload: { weightKg: 80 },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('creates a new entry for a date that does not exist yet', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await putBodyWeight(app, cookie, '2026-01-01', {
      weightKg: 82.5,
      note: 'morgen',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      date: '2026-01-01',
      weightKg: 82.5,
      note: 'morgen',
    });

    await app.close();
  });

  it('saving twice on the same date updates the value instead of failing', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 80 });
    const second = await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 81.5 });

    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({ date: '2026-01-01', weightKg: 81.5 });

    const list = await app.inject({
      method: 'GET',
      url: '/api/body-weight',
      headers: { cookie },
    });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0]).toMatchObject({ date: '2026-01-01', weightKg: 81.5 });

    await app.close();
  });

  it('keeps the original createdAt across an update, since it is not in the upsert set', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const first = await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 80 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 81.5 });

    expect(second.json().createdAt).toBe(first.json().createdAt);

    await app.close();
  });

  it('clears the note when note: null is sent on an update', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 80, note: 'morgen' });
    const response = await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 80, note: null });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ note: null });

    await app.close();
  });

  it('defaults note to null when omitted on a fresh date', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 80 });

    expect(response.json()).toMatchObject({ note: null });

    await app.close();
  });

  it('rejects an invalid date in the URL', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await putBodyWeight(app, cookie, '2026-02-30', { weightKg: 80 });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('rejects weightKg <= 0', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 0 });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects weightKg >= 500', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 500 });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects a weight with more than two decimals', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 80.123 });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects a note longer than 500 characters', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await putBodyWeight(app, cookie, '2026-01-01', {
      weightKg: 80,
      note: 'x'.repeat(501),
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects an unknown field', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await putBodyWeight(app, cookie, '2026-01-01', {
      weightKg: 80,
      extra: 'nope',
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});

describe('DELETE /api/body-weight/:date', () => {
  it('requires the auth cookie', async () => {
    const app = createTestApp();

    const response = await app.inject({ method: 'DELETE', url: '/api/body-weight/2026-01-01' });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('gives 404 when the date does not exist', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/body-weight/2026-01-01',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('deletes an existing entry', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    await putBodyWeight(app, cookie, '2026-01-01', { weightKg: 80 });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/body-weight/2026-01-01',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(204);

    const list = await app.inject({
      method: 'GET',
      url: '/api/body-weight',
      headers: { cookie },
    });
    expect(list.json()).toEqual([]);

    await app.close();
  });
});
