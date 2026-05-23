import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { __resetAuthProviderForTest } from '@/infrastructure/auth';
import { createServer } from '@/presentation/server';

import { prismaForTest, resetDatabase } from './helpers/db';

describe('Auth API', () => {
  const app = createServer();

  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    __resetAuthProviderForTest();
    await resetDatabase();
  });

  afterAll(async () => {
    await prismaForTest.$disconnect();
  });

  const signup = (overrides: Record<string, unknown> = {}) =>
    app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        ...overrides,
      }),
    });

  it('POST /auth/signup creates user and returns tokens', async () => {
    const res = await signup();
    expect(res.status).toBe(201);
    const body = (await res.json()) as { employeeId: string; tokens: { idToken: string } };
    expect(body.employeeId).toBeTypeOf('string');
    expect(body.tokens.idToken).toBeTypeOf('string');
  });

  it('POST /auth/signup with invalid body returns 400', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-email', password: 'short' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login returns tokens for registered user', async () => {
    await signup();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tokens: { idToken: string } };
    expect(body.tokens.idToken).toBeTypeOf('string');
  });

  it('POST /auth/login with wrong password returns 401', async () => {
    await signup();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('GET /auth/me requires Authorization header', async () => {
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns current user', async () => {
    const signupRes = await signup();
    const { tokens } = (await signupRes.json()) as { tokens: { idToken: string } };

    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${tokens.idToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { email: string; displayName: string };
    expect(body.email).toBe('test@example.com');
    expect(body.displayName).toBe('Test User');
  });
});
