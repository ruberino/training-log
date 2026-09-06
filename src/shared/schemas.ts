import { z } from 'zod';

export const loginSchema = z
  .object({
    password: z.string(),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginSchema>;
