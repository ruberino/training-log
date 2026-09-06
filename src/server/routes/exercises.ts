import { desc, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createExerciseSchema,
  updateExerciseSchema,
  type Entry,
  type ExerciseSummary,
} from '../../shared/schemas.ts';
import { isUniqueViolation } from '../db/client.ts';
import { entries, exercises } from '../db/schema.ts';
import { ConflictError, NotFoundError } from '../lib/errors.ts';
import { normalizeName } from '../../shared/normalize.ts';
import { summarise } from '../lib/status.ts';
import { toEntry } from './entries.ts';

const idParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

const listQuerySchema = z
  .object({ includeArchived: z.enum(['true', 'false']).optional() })
  .strict();

type RankedEntryRow = {
  id: number;
  exercise_id: number;
  date: string;
  weight_kg: number | null;
  reps: number | null;
  note: string | null;
  created_at: string;
};

function toSummary(row: typeof exercises.$inferSelect, recentEntries: Entry[]): ExerciseSummary {
  const metric = row.metric as ExerciseSummary['metric'];
  const { latest, previous, delta } = summarise(recentEntries, metric);
  return {
    id: row.id,
    name: row.name,
    metric,
    archivedAt: row.archivedAt,
    latest,
    previous,
    delta,
  };
}

function latestTwoEntries(app: FastifyInstance, exerciseId: number): Entry[] {
  return app.db
    .select()
    .from(entries)
    .where(eq(entries.exerciseId, exerciseId))
    .orderBy(desc(entries.date), desc(entries.id))
    .limit(2)
    .all()
    .map(toEntry);
}

function loadLatestEntriesByExercise(app: FastifyInstance): Map<number, Entry[]> {
  const rows = app.db.all<RankedEntryRow>(sql`
    SELECT id, exercise_id, date, weight_kg, reps, note, created_at FROM (
      SELECT id, exercise_id, date, weight_kg, reps, note, created_at,
             ROW_NUMBER() OVER (PARTITION BY exercise_id ORDER BY date DESC, id DESC) AS rn
      FROM entries
    ) ranked
    WHERE rn <= 2
  `);

  const map = new Map<number, Entry[]>();
  for (const row of rows) {
    const entry: Entry = {
      id: row.id,
      exerciseId: row.exercise_id,
      date: row.date,
      weightKg: row.weight_kg,
      reps: row.reps,
      note: row.note,
      createdAt: row.created_at,
    };
    const existing = map.get(row.exercise_id);
    if (existing) {
      existing.push(entry);
    } else {
      map.set(row.exercise_id, [entry]);
    }
  }
  return map;
}

export default async function exercisesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/exercises', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const includeArchived = query.includeArchived === 'true';

    const rows = includeArchived
      ? app.db.select().from(exercises).all()
      : app.db.select().from(exercises).where(isNull(exercises.archivedAt)).all();

    const latestByExercise = loadLatestEntriesByExercise(app);
    const summaries = rows.map((row) => toSummary(row, latestByExercise.get(row.id) ?? []));

    summaries.sort((a, b) => {
      if (a.latest === null && b.latest === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.latest === null) {
        return 1;
      }
      if (b.latest === null) {
        return -1;
      }
      if (a.latest.date !== b.latest.date) {
        return a.latest.date < b.latest.date ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

    return summaries;
  });

  app.post('/api/exercises', async (request, reply) => {
    const body = createExerciseSchema.parse(request.body);
    const nameNormalized = normalizeName(body.name);
    const createdAt = new Date().toISOString();

    let created;
    try {
      created = app.db
        .insert(exercises)
        .values({ name: body.name, nameNormalized, metric: body.metric, createdAt })
        .returning()
        .get();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Øvelsen finnes allerede');
      }
      throw error;
    }

    reply.status(201).send(toSummary(created, []));
  });

  app.get('/api/exercises/:id', async (request) => {
    const params = idParamSchema.parse(request.params);

    const existing = app.db.select().from(exercises).where(eq(exercises.id, params.id)).get();
    if (!existing) {
      throw new NotFoundError();
    }

    const allEntries = app.db
      .select()
      .from(entries)
      .where(eq(entries.exerciseId, params.id))
      .orderBy(desc(entries.date), desc(entries.id))
      .all()
      .map(toEntry);

    return { ...toSummary(existing, allEntries.slice(0, 2)), entries: allEntries };
  });

  app.patch('/api/exercises/:id', async (request) => {
    const params = idParamSchema.parse(request.params);
    const body = updateExerciseSchema.parse(request.body);

    const existing = app.db.select().from(exercises).where(eq(exercises.id, params.id)).get();
    if (!existing) {
      throw new NotFoundError();
    }

    if (body.metric !== undefined && body.metric !== existing.metric) {
      const entryCount = app.db
        .select({ count: sql<number>`count(*)` })
        .from(entries)
        .where(eq(entries.exerciseId, params.id))
        .get();
      if (entryCount && entryCount.count > 0) {
        throw new ConflictError('Kan ikke endre type på en øvelse med registreringer');
      }
    }

    const updates: Partial<typeof exercises.$inferInsert> = {};
    if (body.name !== undefined) {
      updates.name = body.name;
      updates.nameNormalized = normalizeName(body.name);
    }
    if (body.metric !== undefined) {
      updates.metric = body.metric;
    }
    if (body.archived !== undefined) {
      updates.archivedAt = body.archived ? new Date().toISOString() : null;
    }

    let target = existing;
    if (Object.keys(updates).length > 0) {
      try {
        target = app.db
          .update(exercises)
          .set(updates)
          .where(eq(exercises.id, params.id))
          .returning()
          .get();
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictError('Øvelsen finnes allerede');
        }
        throw error;
      }
    }

    return toSummary(target, latestTwoEntries(app, params.id));
  });
}
