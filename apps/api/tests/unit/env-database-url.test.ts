import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('env DATABASE_URL transform', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.API_PORT = '8080';
    process.env.API_CORS_ORIGIN = 'http://localhost:3000';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('passes through a plain postgresql URL', async () => {
    process.env.DATABASE_URL = 'postgresql://dev:dev@postgres:5432/human_growth';
    const { env } = await import('@/config/env');
    expect(env.DATABASE_URL).toBe('postgresql://dev:dev@postgres:5432/human_growth');
  });

  it('transforms JSON secret format into postgresql URL', async () => {
    process.env.DATABASE_URL = JSON.stringify({
      username: 'app_user',
      password: 'p@ss/word:42',
      host: 'human-growth-dev.cluster-xxx.ap-northeast-1.rds.amazonaws.com',
      port: 5432,
      dbname: 'human_growth',
      engine: 'postgres',
    });
    const { env } = await import('@/config/env');
    expect(env.DATABASE_URL).toBe(
      'postgresql://app_user:p%40ss%2Fword%3A42@human-growth-dev.cluster-xxx.ap-northeast-1.rds.amazonaws.com:5432/human_growth',
    );
  });

  it('rejects invalid JSON shaped value', async () => {
    process.env.DATABASE_URL = '{not-valid-json';
    await expect(() => import('@/config/env')).rejects.toThrow();
  });
});
