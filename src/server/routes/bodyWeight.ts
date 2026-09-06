import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  bodyWeightDateParamSchema,
  putBodyWeightSchema,
  type BodyWeightEntry,
} from '../../shared/schemas.ts';
import { bodyWeight } from '../db/schema.ts';
import { NotFoundError } from '../lib/errors.ts';

function toBodyWeightEntry(row: typeof bodyWeight.$inferSelect): BodyWeightEntry {
  return {
    date: row.date,
    weightKg: row.weightKg,
    note: row.note,
    createdAt: row.createdAt,
  };
}

export default async function bodyWeightRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/body-weight', async () => {
    const rows = app.db.select().from(bodyWeight).orderBy(desc(bodyWeight.date)).all();
    return rows.map(toBodyWeightEntry);
  });

  app.put('/api/body-weight/:date', async (request) => {
    const params = bodyWeightDateParamSchema.parse(request.params);
    const body = putBodyWeightSchema.parse(request.body);
    const weightKg = body.weightKg;
    const note = body.note ?? null;

    const row = app.db
      .insert(bodyWeight)
      .values({ date: params.date, weightKg, note, createdAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: bodyWeight.date, set: { weightKg, note } })
      .returning()
      .get();

    return toBodyWeightEntry(row);
  });

  app.delete('/api/body-weight/:date', async (request, reply) => {
    const params = bodyWeightDateParamSchema.parse(request.params);

    const existing = app.db.select().from(bodyWeight).where(eq(bodyWeight.date, params.date)).get();
    if (!existing) {
      throw new NotFoundError();
    }

    app.db.delete(bodyWeight).where(eq(bodyWeight.date, params.date)).run();
    reply.status(204).send();
  });
}
