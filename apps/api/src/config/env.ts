import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive(),
  API_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_CORS_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  COGNITO_USER_POOL_ID: z.string().min(1).optional(),
  COGNITO_CLIENT_ID: z.string().min(1).optional(),
  COGNITO_REGION: z.string().min(1).default('ap-northeast-1'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env: Env = parsed.data;
