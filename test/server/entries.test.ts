import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/createTestApp.ts';
import { loginCookie } from '../helpers/login.ts';

async function createExercise(
  app: ReturnType<typeof createTestApp>,
  cookie: string,
  body: Record<string, unknown>,
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/exercises',
    headers: { cookie },
    payload: body,
  });
  return response.json();
}

async function createEntry(
  app: ReturnType<typeof createTestApp>,
  cookie: string,
  body: Record<string, unknown>,
) {
  return app.inject({ method: 'POST', url: '/api/entries', headers: { cookie }, payload: body });
}

describe('POST /api/entries', () => {
  it('requires the auth cookie', async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/entries',
      payload: { exerciseId: 1, date: '2026-01-01', weightKg: 80 },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('gives 404 when the exercise does not exist', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await createEntry(app, cookie, {
      exerciseId: 999,
      date: '2026-01-01',
      weightKg: 80,
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects a weight with more than two decimals', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });

    const response = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      weightKg: 82.567,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('accepts weights with at most two decimals, including float-unsafe ones like 1.15', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });

    const first = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      weightKg: 82.5,
    });
    expect(first.statusCode).toBe(201);

    const second = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-02',
      weightKg: 1.15,
    });
    expect(second.statusCode).toBe(201);
    expect(second.json().weightKg).toBe(1.15);

    await app.close();
  });

  it('rejects a weight exercise entry with weightKg 0 or missing', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });

    const zero = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      weightKg: 0,
    });
    expect(zero.statusCode).toBe(400);

    const missing = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
    });
    expect(missing.statusCode).toBe(400);

    await app.close();
  });

  it('requires reps on a reps exercise, but weightKg may be omitted, null or 0', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Pull-ups', metric: 'reps' });

    const missingReps = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
    });
    expect(missingReps.statusCode).toBe(400);

    const omittedWeight = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      reps: 10,
    });
    expect(omittedWeight.statusCode).toBe(201);
    expect(omittedWeight.json().weightKg).toBeNull();

    const nullWeight = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-02',
      reps: 11,
      weightKg: null,
    });
    expect(nullWeight.statusCode).toBe(201);

    const zeroWeight = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-03',
      reps: 12,
      weightKg: 0,
    });
    expect(zeroWeight.statusCode).toBe(201);

    await app.close();
  });

  it('rejects a date that does not exist on the calendar', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });

    const response = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-02-30',
      weightKg: 80,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('rejects reps 0 on a reps exercise', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Pull-ups', metric: 'reps' });

    const response = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      reps: 0,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('rejects a note longer than 500 characters', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });

    const response = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      weightKg: 80,
      note: 'a'.repeat(501),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('rejects an unknown property', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });

    const response = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      weightKg: 80,
      colour: 'red',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });
});

describe('GET /api/entries', () => {
  it('requires the auth cookie', async () => {
    const app = createTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/entries?exerciseId=1' });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('requires exerciseId', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/entries',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('orders entries by date DESC, id DESC', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });

    await createEntry(app, cookie, { exerciseId: exercise.id, date: '2026-01-05', weightKg: 80 });
    await createEntry(app, cookie, { exerciseId: exercise.id, date: '2026-01-01', weightKg: 78 });
    const sameDateFirst = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-05',
      weightKg: 81,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/entries?exerciseId=${exercise.id}`,
      headers: { cookie },
    });

    const dates = response.json().map((entry: { date: string }) => entry.date);
    expect(dates).toEqual(['2026-01-05', '2026-01-05', '2026-01-01']);
    expect(response.json()[0].id).toBe(sameDateFirst.json().id);

    await app.close();
  });

  it('filters by an inclusive from/to date range', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });

    await createEntry(app, cookie, { exerciseId: exercise.id, date: '2026-01-01', weightKg: 78 });
    await createEntry(app, cookie, { exerciseId: exercise.id, date: '2026-01-10', weightKg: 80 });
    await createEntry(app, cookie, { exerciseId: exercise.id, date: '2026-01-20', weightKg: 82 });

    const response = await app.inject({
      method: 'GET',
      url: `/api/entries?exerciseId=${exercise.id}&from=2026-01-01&to=2026-01-10`,
      headers: { cookie },
    });

    const dates = response.json().map((entry: { date: string }) => entry.date);
    expect(dates).toEqual(['2026-01-10', '2026-01-01']);

    await app.close();
  });
});

describe('PATCH /api/entries/:id', () => {
  it('gives 404 when the entry does not exist', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/entries/999',
      headers: { cookie },
      payload: { weightKg: 80 },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects an unknown property', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });
    const created = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      weightKg: 80,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/entries/${created.json().id}`,
      headers: { cookie },
      payload: { colour: 'red' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('re-checks the metric rule on the merged entry', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });
    const created = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      weightKg: 80,
    });
    const id = created.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/entries/${id}`,
      headers: { cookie },
      payload: { weightKg: null },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('clears note, weightKg and reps with null', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Pull-ups', metric: 'reps' });
    const created = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-01',
      reps: 10,
      weightKg: 5,
      note: 'med belte',
    });
    const id = created.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/entries/${id}`,
      headers: { cookie },
      payload: { weightKg: null, note: null },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.weightKg).toBeNull();
    expect(body.note).toBeNull();
    expect(body.reps).toBe(10);

    await app.close();
  });
});

describe('DELETE /api/entries/:id', () => {
  it('gives 404 when the entry does not exist', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/entries/999',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('removes the entry, and deleting the latest makes the previous one latest', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });
    await createEntry(app, cookie, { exerciseId: exercise.id, date: '2026-01-01', weightKg: 80 });
    const second = await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-08',
      weightKg: 82.5,
    });

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/entries/${second.json().id}`,
      headers: { cookie },
    });
    expect(deleteResponse.statusCode).toBe(204);

    const detail = await app.inject({
      method: 'GET',
      url: `/api/exercises/${exercise.id}`,
      headers: { cookie },
    });
    expect(detail.json().latest.weightKg).toBe(80);
    expect(detail.json().previous).toBeNull();
    expect(detail.json().delta).toBeNull();

    await app.close();
  });
});

describe('status aggregation on GET /api/exercises', () => {
  it('has null delta with one entry and a positive delta with two', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const exercise = await createExercise(app, cookie, { name: 'Benkpress' });
    await createEntry(app, cookie, { exerciseId: exercise.id, date: '2026-01-01', weightKg: 80 });

    const oneEntry = await app.inject({
      method: 'GET',
      url: '/api/exercises',
      headers: { cookie },
    });
    expect(oneEntry.json()[0].delta).toBeNull();

    await createEntry(app, cookie, {
      exerciseId: exercise.id,
      date: '2026-01-08',
      weightKg: 82.5,
    });

    const twoEntries = await app.inject({
      method: 'GET',
      url: '/api/exercises',
      headers: { cookie },
    });
    expect(twoEntries.json()[0].delta).toBe(2.5);

    await app.close();
  });

  it('sorts by latest entry date descending, exercises without entries last, then by name', async () => {
    const app = createTestApp();
    const cookie = await loginCookie(app);
    const withoutEntries = await createExercise(app, cookie, { name: 'Zulu' });
    const older = await createExercise(app, cookie, { name: 'Older' });
    const newer = await createExercise(app, cookie, { name: 'Newer' });
    await createEntry(app, cookie, { exerciseId: older.id, date: '2026-01-01', weightKg: 80 });
    await createEntry(app, cookie, { exerciseId: newer.id, date: '2026-01-10', weightKg: 80 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/exercises',
      headers: { cookie },
    });

    const names = response.json().map((item: { name: string }) => item.name);
    expect(names).toEqual(['Newer', 'Older', withoutEntries.name]);

    await app.close();
  });

  it('runs at most two SQL statements to list exercises', async () => {
    const statements: string[] = [];
    const app = createTestApp({ dbVerbose: (message) => statements.push(String(message)) });
    const cookie = await loginCookie(app);
    for (let i = 0; i < 3; i += 1) {
      const exercise = await createExercise(app, cookie, { name: `Øvelse ${i}` });
      await createEntry(app, cookie, {
        exerciseId: exercise.id,
        date: '2026-01-01',
        weightKg: 80,
      });
    }

    statements.length = 0;
    const response = await app.inject({
      method: 'GET',
      url: '/api/exercises',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(statements.length).toBeLessThanOrEqual(2);

    await app.close();
  });
});
