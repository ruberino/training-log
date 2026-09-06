import { z } from 'zod';
import { isIsoDate } from './dates.ts';

export const loginSchema = z
  .object({
    password: z.string().min(1).max(200),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginSchema>;

const metricSchema = z.enum(['weight', 'reps']);

export const createExerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    metric: metricSchema.default('weight'),
  })
  .strict();

export type CreateExerciseRequest = z.infer<typeof createExerciseSchema>;

export const updateExerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    metric: metricSchema.optional(),
    archived: z.boolean().optional(),
  })
  .strict();

export type UpdateExerciseRequest = z.infer<typeof updateExerciseSchema>;

const dateSchema = z.string().refine(isIsoDate, { message: 'Ugyldig dato' });

function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

const weightKgSchema = z
  .number()
  .gte(0)
  .lt(1000)
  .refine(hasAtMostTwoDecimals, { message: 'Vekt kan ha maks to desimaler' });

const repsSchema = z.number().int().gte(1).lte(999);

const noteSchema = z.string().max(500);

export const createEntrySchema = z
  .object({
    exerciseId: z.number().int().positive(),
    date: dateSchema,
    weightKg: weightKgSchema.nullable().optional(),
    reps: repsSchema.nullable().optional(),
    note: noteSchema.nullable().optional(),
  })
  .strict();

export type CreateEntryRequest = z.infer<typeof createEntrySchema>;

export const updateEntrySchema = z
  .object({
    date: dateSchema.optional(),
    weightKg: weightKgSchema.nullable().optional(),
    reps: repsSchema.nullable().optional(),
    note: noteSchema.nullable().optional(),
  })
  .strict();

export type UpdateEntryRequest = z.infer<typeof updateEntrySchema>;

export const listEntriesQuerySchema = z
  .object({
    exerciseId: z.coerce.number().int().positive(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .strict();

export const entrySchema = z.object({
  id: z.number().int(),
  exerciseId: z.number().int(),
  date: z.string(),
  weightKg: z.number().nullable(),
  reps: z.number().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export type Entry = z.infer<typeof entrySchema>;

export const exerciseSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  metric: metricSchema,
  archivedAt: z.string().nullable(),
  latest: entrySchema.nullable(),
  previous: entrySchema.nullable(),
  delta: z.number().nullable(),
});

export type ExerciseSummary = z.infer<typeof exerciseSummarySchema>;

export const exerciseDetailSchema = exerciseSummarySchema.extend({
  entries: z.array(entrySchema),
});

export type ExerciseDetail = z.infer<typeof exerciseDetailSchema>;
