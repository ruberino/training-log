import { and, desc, eq, gte, lte } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createEntrySchema,
  listEntriesQuerySchema,
  updateEntrySchema,
  type Entry,
} from '../../shared/schemas.ts';
import { entries, exercises } from '../db/schema.ts';
import { NotFoundError, ValidationError } from '../lib/errors.ts';

const idParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export function toEntry(row: typeof entries.$inferSelect): Entry {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    date: row.date,
    weightKg: row.weightKg,
    reps: row.reps,
    note: row.note,
    createdAt: row.createdAt,
  };
}

function assertMetricRule(
  metric: 'weight' | 'reps',
  weightKg: number | null,
  reps: number | null,
): void {
  if (metric === 'weight') {
    if (weightKg === null || weightKg <= 0) {
      throw new ValidationError('Vekt må være større enn 0 for denne øvelsen');
    }
  } else if (reps === null) {
    throw new ValidationError('Repetisjoner er påkrevd for denne øvelsen');
  }
}

export default async function entriesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/entries', async (request) => {
    const query = listEntriesQuerySchema.parse(request.query);

    const conditions = [eq(entries.exerciseId, query.exerciseId)];
    if (query.from !== undefined) {
      conditions.push(gte(entries.date, query.from));
    }
    if (query.to !== undefined) {
      conditions.push(lte(entries.date, query.to));
    }

    const rows = app.db
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.date), desc(entries.id))
      .all();

    return rows.map(toEntry);
  });

  app.post('/api/entries', async (request, reply) => {
    const body = createEntrySchema.parse(request.body);

    const exercise = app.db.select().from(exercises).where(eq(exercises.id, body.exerciseId)).get();
    if (!exercise) {
      throw new NotFoundError();
    }

    const weightKg = body.weightKg ?? null;
    const reps = body.reps ?? null;
    assertMetricRule(exercise.metric as 'weight' | 'reps', weightKg, reps);

    const created = app.db
      .insert(entries)
      .values({
        exerciseId: body.exerciseId,
        date: body.date,
        weightKg,
        reps,
        note: body.note ?? null,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();

    reply.status(201).send(toEntry(created));
  });

  app.patch('/api/entries/:id', async (request) => {
    const params = idParamSchema.parse(request.params);
    const body = updateEntrySchema.parse(request.body);

    const existing = app.db.select().from(entries).where(eq(entries.id, params.id)).get();
    if (!existing) {
      throw new NotFoundError();
    }

    const exercise = app.db
      .select()
      .from(exercises)
      .where(eq(exercises.id, existing.exerciseId))
      .get();
    if (!exercise) {
      throw new NotFoundError();
    }

    const merged = {
      date: body.date ?? existing.date,
      weightKg: 'weightKg' in body ? (body.weightKg ?? null) : existing.weightKg,
      reps: 'reps' in body ? (body.reps ?? null) : existing.reps,
      note: 'note' in body ? (body.note ?? null) : existing.note,
    };

    assertMetricRule(exercise.metric as 'weight' | 'reps', merged.weightKg, merged.reps);

    const updated = app.db
      .update(entries)
      .set(merged)
      .where(eq(entries.id, params.id))
      .returning()
      .get();

    return toEntry(updated);
  });

  app.delete('/api/entries/:id', async (request, reply) => {
    const params = idParamSchema.parse(request.params);

    const existing = app.db.select().from(entries).where(eq(entries.id, params.id)).get();
    if (!existing) {
      throw new NotFoundError();
    }

    app.db.delete(entries).where(eq(entries.id, params.id)).run();
    reply.status(204).send();
  });
}
