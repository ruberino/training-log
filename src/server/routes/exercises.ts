import { asc, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createExerciseSchema,
  updateExerciseSchema,
  type ExerciseSummary,
} from '../../shared/schemas.ts';
import { isUniqueViolation } from '../db/client.ts';
import { entries, exercises } from '../db/schema.ts';
import { ConflictError, NotFoundError } from '../lib/errors.ts';
import { normalizeName } from '../lib/normalize.ts';

const idParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

const listQuerySchema = z
  .object({ includeArchived: z.enum(['true', 'false']).optional() })
  .strict();

function toSummary(row: typeof exercises.$inferSelect): ExerciseSummary {
  return {
    id: row.id,
    name: row.name,
    metric: row.metric as ExerciseSummary['metric'],
    archivedAt: row.archivedAt,
    latest: null,
    previous: null,
    delta: null,
  };
}

export default async function exercisesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/exercises', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const includeArchived = query.includeArchived === 'true';

    const rows = includeArchived
      ? app.db.select().from(exercises).orderBy(asc(exercises.name)).all()
      : app.db
          .select()
          .from(exercises)
          .where(isNull(exercises.archivedAt))
          .orderBy(asc(exercises.name))
          .all();

    return rows.map(toSummary);
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

    reply.status(201).send(toSummary(created));
  });

  app.get('/api/exercises/:id', async (request) => {
    const params = idParamSchema.parse(request.params);

    const existing = app.db.select().from(exercises).where(eq(exercises.id, params.id)).get();
    if (!existing) {
      throw new NotFoundError();
    }

    return { ...toSummary(existing), entries: [] };
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

    if (Object.keys(updates).length === 0) {
      return toSummary(existing);
    }

    let updated;
    try {
      updated = app.db
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

    return toSummary(updated);
  });
}
