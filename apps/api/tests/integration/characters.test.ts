import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { __resetAuthProviderForTest } from '@/infrastructure/auth';
import { createServer } from '@/presentation/server';

import { prismaForTest, resetDatabase } from './helpers/db';

const signupAndLogin = async (app: ReturnType<typeof createServer>, email: string) => {
  const res = await app.request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'password123',
      displayName: 'Alice',
      department: 'Engineering',
    }),
  });
  const body = (await res.json()) as { tokens: { idToken: string } };
  return body.tokens.idToken;
};

describe('Characters API', () => {
  const app = createServer();

  beforeEach(async () => {
    __resetAuthProviderForTest();
    await resetDatabase();
  });

  afterAll(async () => {
    await prismaForTest.$disconnect();
  });

  it('GET /characters/me creates default character on first call', async () => {
    const token = await signupAndLogin(app, 'a@example.com');
    const res = await app.request('/api/characters/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      name: string;
      className: string;
      level: number;
      experiencePoint: number;
      skills: unknown[];
    };
    expect(body.name).toBe('Alice');
    expect(body.className).toBe('Engineer');
    expect(body.level).toBe(1);
    expect(body.experiencePoint).toBe(0);
    expect(Array.isArray(body.skills)).toBe(true);
  });

  it('GET /characters/me returns same character on second call', async () => {
    const token = await signupAndLogin(app, 'b@example.com');
    const r1 = (await (
      await app.request('/api/characters/me', { headers: { Authorization: `Bearer ${token}` } })
    ).json()) as { id: string };
    const r2 = (await (
      await app.request('/api/characters/me', { headers: { Authorization: `Bearer ${token}` } })
    ).json()) as { id: string };
    expect(r1.id).toBe(r2.id);
  });

  it('GET /characters/me requires authentication', async () => {
    const res = await app.request('/api/characters/me');
    expect(res.status).toBe(401);
  });
});
