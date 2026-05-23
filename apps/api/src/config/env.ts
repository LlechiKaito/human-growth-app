import { z } from 'zod';

/**
 * App Runner で RDS の自動生成シークレットを runtimeEnvironmentSecrets に渡すと、
 * DATABASE_URL には JSON 文字列が入る。これを postgresql:// URL に変換する。
 * ローカル開発 (postgresql://... を直接渡す) ではそのまま通す。
 */
const transformDatabaseUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as {
      username: string;
      password: string;
      host: string;
      port: number | string;
      dbname: string;
    };
    const user = encodeURIComponent(parsed.username);
    const pass = encodeURIComponent(parsed.password);
    return `postgresql://${user}:${pass}@${parsed.host}:${parsed.port}/${parsed.dbname}`;
  } catch (e) {
    throw new Error(`DATABASE_URL is not a valid postgresql URL nor a JSON secret: ${(e as Error).message}`);
  }
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive(),
  API_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_CORS_ORIGIN: z.union([z.string().url(), z.literal('*')]),
  DATABASE_URL: z.string().transform(transformDatabaseUrl).pipe(z.string().url()),
  AUTH_PROVIDER: z.enum(['cognito', 'local']).default('local'),
  AUTH_LOCAL_SECRET: z.string().min(16).default('dev-secret-change-me-in-prod-please'),
  COGNITO_USER_POOL_ID: z.string().min(1).optional(),
  COGNITO_CLIENT_ID: z.string().min(1).optional(),
  COGNITO_REGION: z.string().min(1).default('ap-northeast-1'),
  // ローカル開発で admin として扱うメールアドレス (LocalAuthProvider のみ)
  // 例: ADMIN_EMAILS=admin@example.com,boss@example.com
  ADMIN_EMAILS: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env: Env = parsed.data;
