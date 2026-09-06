import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, type OpenedDatabase } from '../../src/server/db/client.ts';
import { runMigrations } from '../../src/server/db/migrate.ts';
import { entries, exercises } from '../../src/server/db/schema.ts';

function createDb(): OpenedDatabase {
  const opened = openDatabase(':memory:');
  runMigrations(opened.db);
  return opened;
}

describe('database schema and migrations', () => {
  let opened: OpenedDatabase;

  afterEach(() => {
    opened.sqlite.close();
  });

  it('creates both tables after migrating', () => {
    opened = createDb();

    const rows = opened.sqlite
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name != '__drizzle_migrations'",
      )
      .all() as { name: string }[];

    expect(rows.map((row) => row.name).sort()).toEqual(['entries', 'exercises']);
  });

  it('running migrations again does not fail or duplicate anything', () => {
    opened = createDb();

    expect(() => runMigrations(opened.db)).not.toThrow();

    const rows = opened.sqlite
      .prepare("select name from sqlite_master where type = 'table' and name = 'exercises'")
      .all();
    expect(rows).toHaveLength(1);
  });

  it('defaults metric to weight and rejects an unknown metric', () => {
    opened = createDb();

    const created = opened.db
      .insert(exercises)
      .values({
        name: 'Benkpress',
        nameNormalized: 'benkpress',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      .returning()
      .get();
    expect(created.metric).toBe('weight');

    expect(() =>
      opened.db
        .insert(exercises)
        .values({
          name: 'Ugyldig',
          nameNormalized: 'ugyldig',
          metric: 'sets',
          createdAt: '2026-01-01T00:00:00.000Z',
        })
        .run(),
    ).toThrow(/CHECK constraint failed/);
  });

  it('rejects a negative weight but accepts zero and null at the database level', () => {
    opened = createDb();

    const exercise = opened.db
      .insert(exercises)
      .values({
        name: 'Pull-ups',
        nameNormalized: 'pull-ups',
        metric: 'reps',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      .returning()
      .get();

    expect(() =>
      opened.db
        .insert(entries)
        .values({
          exerciseId: exercise.id,
          date: '2026-01-01',
          weightKg: -1,
          createdAt: '2026-01-01T00:00:00.000Z',
        })
        .run(),
    ).toThrow(/CHECK constraint failed/);

    expect(() =>
      opened.db
        .insert(entries)
        .values({
          exerciseId: exercise.id,
          date: '2026-01-01',
          weightKg: 0,
          reps: 10,
          createdAt: '2026-01-01T00:00:00.000Z',
        })
        .run(),
    ).not.toThrow();

    expect(() =>
      opened.db
        .insert(entries)
        .values({
          exerciseId: exercise.id,
          date: '2026-01-02',
          reps: 12,
          createdAt: '2026-01-02T00:00:00.000Z',
        })
        .run(),
    ).not.toThrow();
  });

  it('cascades deleting an exercise to its entries', () => {
    opened = createDb();

    const exercise = opened.db
      .insert(exercises)
      .values({
        name: 'Markløft',
        nameNormalized: 'markløft',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      .returning()
      .get();
    opened.db
      .insert(entries)
      .values({
        exerciseId: exercise.id,
        date: '2026-01-01',
        weightKg: 100,
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      .run();

    opened.db.delete(exercises).where(eq(exercises.id, exercise.id)).run();

    expect(opened.db.select().from(entries).all()).toHaveLength(0);
  });

  it('rejects an entry referencing an unknown exercise', () => {
    opened = createDb();

    expect(() =>
      opened.db
        .insert(entries)
        .values({
          exerciseId: 999,
          date: '2026-01-01',
          weightKg: 100,
          createdAt: '2026-01-01T00:00:00.000Z',
        })
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });
});
