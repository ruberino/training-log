import { describe, expect, it } from 'vitest';
import { exerciseSummarySchema } from '../../src/shared/schemas.ts';
import { entries } from '../../src/server/db/schema.ts';
import { createTestApp } from '../helpers/createTestApp.ts';
import { loginCookie } from '../helpers/login.ts';

async function createExercise(
  app: Awaited<ReturnType<typeof createTestApp>>,
  cookie: string,
  body: Record<string, unknown>,
) {
  return app.inject({ method: 'POST', url: '/api/exercises', headers: { cookie }, payload: body });
}

describe('GET /api/exercises', () => {
  it('requires the auth cookie', async () => {
    const app = createTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/exercises' });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('excludes archived exercises by default and includes them with includeArchived=true', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const created = await createExercise(app, cookie, { name: 'Knebøy' });
    const id = created.json().id;
    await app.inject({
      method: 'PATCH',
      url: `/api/exercises/${id}`,
      headers: { cookie },
      payload: { archived: true },
    });

    const defaultList = await app.inject({
      method: 'GET',
      url: '/api/exercises',
      headers: { cookie },
    });
    expect(defaultList.json()).toEqual([]);

    const withArchived = await app.inject({
      method: 'GET',
      url: '/api/exercises?includeArchived=true',
      headers: { cookie },
    });
    expect(withArchived.json()).toHaveLength(1);
    expect(withArchived.json()[0].archivedAt).not.toBeNull();

    await app.close();
  });

  it('rejects an invalid includeArchived query value with 400', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/exercises?includeArchived=maybe',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('returns exercises matching exerciseSummarySchema', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    await createExercise(app, cookie, { name: 'Markløft' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/exercises',
      headers: { cookie },
    });

    for (const item of response.json()) {
      expect(() => exerciseSummarySchema.parse(item)).not.toThrow();
    }

    await app.close();
  });
});

describe('POST /api/exercises', () => {
  it('creates an exercise defaulting metric to weight', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await createExercise(app, cookie, { name: 'Benkpress' });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.metric).toBe('weight');
    expect(() => exerciseSummarySchema.parse(body)).not.toThrow();

    await app.close();
  });

  it('creates an exercise with metric reps', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await createExercise(app, cookie, { name: 'Pull-ups', metric: 'reps' });

    expect(response.statusCode).toBe(201);
    expect(response.json().metric).toBe('reps');

    await app.close();
  });

  it('rejects a duplicate name after normalization with 409', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const first = await createExercise(app, cookie, { name: 'Benkpress' });
    expect(first.statusCode).toBe(201);

    const second = await createExercise(app, cookie, { name: 'benkpress ' });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('CONFLICT');

    await app.close();
  });

  it('rejects a name longer than 60 characters, naming the field', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await createExercise(app, cookie, { name: 'A'.repeat(61) });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0].path).toEqual(['name']);

    await app.close();
  });

  it('rejects an unknown property with 400', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await createExercise(app, cookie, { name: 'Knebøy', colour: 'red' });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });
});

describe('GET /api/exercises/:id', () => {
  it('gives 404 when the exercise does not exist', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/exercises/999',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns the exercise with an empty entries list', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const created = await createExercise(app, cookie, { name: 'Knebøy' });
    const id = created.json().id;

    const response = await app.inject({
      method: 'GET',
      url: `/api/exercises/${id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().entries).toEqual([]);

    await app.close();
  });

  it('rejects a non-numeric id with 400', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/exercises/abc',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });
});

describe('PATCH /api/exercises/:id', () => {
  it('renames an exercise', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const created = await createExercise(app, cookie, { name: 'Knebøy' });
    const id = created.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/exercises/${id}`,
      headers: { cookie },
      payload: { name: 'Frontbøy' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe('Frontbøy');

    await app.close();
  });

  it('rejects renaming to another existing name with 409', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    await createExercise(app, cookie, { name: 'Knebøy' });
    const second = await createExercise(app, cookie, { name: 'Markløft' });
    const secondId = second.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/exercises/${secondId}`,
      headers: { cookie },
      payload: { name: 'Knebøy' },
    });

    expect(response.statusCode).toBe(409);

    await app.close();
  });

  it('allows renaming to its own name with different casing', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const created = await createExercise(app, cookie, { name: 'Knebøy' });
    const id = created.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/exercises/${id}`,
      headers: { cookie },
      payload: { name: 'KNEBØY' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe('KNEBØY');

    await app.close();
  });

  it('archives and restores an exercise', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const created = await createExercise(app, cookie, { name: 'Knebøy' });
    const id = created.json().id;

    const archived = await app.inject({
      method: 'PATCH',
      url: `/api/exercises/${id}`,
      headers: { cookie },
      payload: { archived: true },
    });
    expect(archived.json().archivedAt).not.toBeNull();

    const restored = await app.inject({
      method: 'PATCH',
      url: `/api/exercises/${id}`,
      headers: { cookie },
      payload: { archived: false },
    });
    expect(restored.json().archivedAt).toBeNull();

    await app.close();
  });

  it('rejects changing metric on an exercise with an entry', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const created = await createExercise(app, cookie, { name: 'Pull-ups', metric: 'reps' });
    const id = created.json().id;

    app.db
      .insert(entries)
      .values({
        exerciseId: id,
        date: '2026-01-01',
        reps: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      .run();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/exercises/${id}`,
      headers: { cookie },
      payload: { metric: 'weight' },
    });

    expect(response.statusCode).toBe(409);

    await app.close();
  });

  it('allows changing metric on an exercise without entries', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const created = await createExercise(app, cookie, { name: 'Pull-ups', metric: 'reps' });
    const id = created.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/exercises/${id}`,
      headers: { cookie },
      payload: { metric: 'weight' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().metric).toBe('weight');

    await app.close();
  });

  it('rejects an unknown metric value with 400', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const created = await createExercise(app, cookie, { name: 'Knebøy' });
    const id = created.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/exercises/${id}`,
      headers: { cookie },
      payload: { metric: 'time' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });
});
