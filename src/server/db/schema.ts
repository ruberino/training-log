import { desc, sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const exercises = sqliteTable(
  'exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').notNull().unique(),
    metric: text('metric').notNull().default('weight'),
    createdAt: text('created_at').notNull(),
    archivedAt: text('archived_at'),
  },
  (table) => [check('exercises_metric_check', sql`${table.metric} in ('weight', 'reps')`)],
);

export const entries = sqliteTable(
  'entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    note: text('note'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    check(
      'entries_weight_kg_check',
      sql`${table.weightKg} is null or (${table.weightKg} >= 0 and ${table.weightKg} < 1000)`,
    ),
    check(
      'entries_reps_check',
      sql`${table.reps} is null or (${table.reps} > 0 and ${table.reps} < 1000)`,
    ),
    index('entries_exercise_date').on(table.exerciseId, desc(table.date), desc(table.id)),
  ],
);

export const bodyWeight = sqliteTable(
  'body_weight',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull().unique(),
    weightKg: real('weight_kg').notNull(),
    note: text('note'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    check('body_weight_weight_kg_check', sql`${table.weightKg} > 0 and ${table.weightKg} < 500`),
  ],
);
