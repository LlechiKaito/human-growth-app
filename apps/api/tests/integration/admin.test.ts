import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { __resetAuthProviderForTest } from '@/infrastructure/auth';
import { createServer } from '@/presentation/server';

import { prismaForTest, resetDatabase } from './helpers/db';

const ADMIN_EMAIL = 'admin@example.com';
const USER_EMAIL = 'user@example.com';

const signup = (app: ReturnType<typeof createServer>, email: string) =>
  app
    .request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123',
        displayName: email.split('@')[0],
      }),
    })
    .then((r) => r.json() as Promise<{ tokens: { idToken: string } }>);

describe('Admin Quest CRUD', () => {
  const app = createServer();

  beforeEach(async () => {
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    __resetAuthProviderForTest();
    await resetDatabase();
  });

  afterAll(async () => {
    delete process.env.ADMIN_EMAILS;
    await prismaForTest.$disconnect();
  });

  it('POST /api/admin/quests requires admin role (403 for normal user)', async () => {
    const { tokens } = await signup(app, USER_EMAIL);
    const res = await app.request('/api/admin/quests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.idToken}`,
      },
      body: JSON.stringify({ title: 'New Quest', rewardXp: 50 }),
    });
    expect(res.status).toBe(403);
  });

  it('admin can create / list / update / delete a quest', async () => {
    const { tokens } = await signup(app, ADMIN_EMAIL);
    const auth = { Authorization: `Bearer ${tokens.idToken}` };

    // create
    const createRes = await app.request('/api/admin/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({
        title: 'Defeat Production Bug',
        description: 'Root cause and fix the prod incident',
        difficulty: 'HARD',
        rewardXp: 300,
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; status: string };
    expect(created.status).toBe('OPEN');

    // list
    const listRes = await app.request('/api/admin/quests', { headers: auth });
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as Array<{ id: string }>;
    expect(list.find((q) => q.id === created.id)).toBeTruthy();

    // update
    const updRes = await app.request(`/api/admin/quests/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ title: 'Renamed Quest', rewardXp: 400 }),
    });
    expect(updRes.status).toBe(200);
    const updated = (await updRes.json()) as { title: string; rewardXp: number };
    expect(updated.title).toBe('Renamed Quest');
    expect(updated.rewardXp).toBe(400);

    // delete
    const delRes = await app.request(`/api/admin/quests/${created.id}`, {
      method: 'DELETE',
      headers: auth,
    });
    expect(delRes.status).toBe(204);

    const afterRes = await app.request('/api/admin/quests', { headers: auth });
    const after = (await afterRes.json()) as Array<{ id: string }>;
    expect(after.find((q) => q.id === created.id)).toBeUndefined();
  });

  it('GET /api/auth/me returns isAdmin=true for admin user', async () => {
    const { tokens } = await signup(app, ADMIN_EMAIL);
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${tokens.idToken}` },
    });
    const me = (await res.json()) as { isAdmin: boolean };
    expect(me.isAdmin).toBe(true);
  });

  it('GET /api/auth/me returns isAdmin=false for normal user', async () => {
    const { tokens } = await signup(app, USER_EMAIL);
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${tokens.idToken}` },
    });
    const me = (await res.json()) as { isAdmin: boolean };
    expect(me.isAdmin).toBe(false);
  });

  it('admin can create quest with documentRequirement=REQUIRED', async () => {
    const { tokens } = await signup(app, ADMIN_EMAIL);
    const auth = { Authorization: `Bearer ${tokens.idToken}` };

    const createRes = await app.request('/api/admin/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({
        title: 'With Doc Required',
        rewardXp: 100,
        documentRequirement: 'REQUIRED',
        testRequirement: 'NONE',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      documentRequirement: string;
      testRequirement: string;
    };
    expect(created.documentRequirement).toBe('REQUIRED');
    expect(created.testRequirement).toBe('NONE');
  });

  it('admin can update a quest to switch documentRequirement', async () => {
    const { tokens } = await signup(app, ADMIN_EMAIL);
    const auth = { Authorization: `Bearer ${tokens.idToken}` };

    const createRes = await app.request('/api/admin/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ title: 'Q', rewardXp: 50 }),
    });
    const { id } = (await createRes.json()) as { id: string };

    const updRes = await app.request(`/api/admin/quests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ documentRequirement: 'OPTIONAL' }),
    });
    expect(updRes.status).toBe(200);
    const updated = (await updRes.json()) as { documentRequirement: string };
    expect(updated.documentRequirement).toBe('OPTIONAL');
  });

  it('default for documentRequirement/testRequirement is NONE', async () => {
    const { tokens } = await signup(app, ADMIN_EMAIL);
    const auth = { Authorization: `Bearer ${tokens.idToken}` };

    const createRes = await app.request('/api/admin/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ title: 'Default Q', rewardXp: 50 }),
    });
    const created = (await createRes.json()) as {
      documentRequirement: string;
      testRequirement: string;
    };
    expect(created.documentRequirement).toBe('NONE');
    expect(created.testRequirement).toBe('NONE');
  });
});
