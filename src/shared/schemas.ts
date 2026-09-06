import { z } from 'zod';

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

export const exerciseSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  metric: metricSchema,
  archivedAt: z.string().nullable(),
  latest: z.null(),
  previous: z.null(),
  delta: z.null(),
});

export type ExerciseSummary = z.infer<typeof exerciseSummarySchema>;
