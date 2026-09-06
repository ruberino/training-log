import { z } from 'zod';

const NODE_ENVS = ['development', 'production', 'test'] as const;
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_PATH: z.string().min(1).default('./data/training-log.db'),
  APP_PASSWORD: z.string().min(8, 'APP_PASSWORD must be at least 8 characters long'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long'),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  TZ: z.string().min(1).default('Europe/Oslo'),
});

export type Config = {
  nodeEnv: (typeof NODE_ENVS)[number];
  port: number;
  host: string;
  databasePath: string;
  appPassword: string;
  sessionSecret: string;
  logLevel: (typeof LOG_LEVELS)[number];
  tz: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${message}`);
  }

  const parsed = result.data;
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    host: parsed.HOST,
    databasePath: parsed.DATABASE_PATH,
    appPassword: parsed.APP_PASSWORD,
    sessionSecret: parsed.SESSION_SECRET,
    logLevel: parsed.LOG_LEVEL,
    tz: parsed.TZ,
  };
}
