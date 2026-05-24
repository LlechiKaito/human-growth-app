import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { __resetAuthProviderForTest } from '@/infrastructure/auth';
import {
  __resetStorageForTest,
  __setStorageForTest,
} from '@/infrastructure/storage';
import { InMemoryStorageService } from '@/infrastructure/storage/s3.service';
import { createServer } from '@/presentation/server';

import { prismaForTest, resetDatabase } from './helpers/db';

const ADMIN_EMAIL = 'admin-doc@example.com';
const USER_EMAIL = 'user-doc@example.com';

const signup = async (
  app: ReturnType<typeof createServer>,
  email: string,
): Promise<string> => {
  const res = await app.request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'password123',
      displayName: email.split('@')[0],
      department: 'Engineering',
    }),
  });
  const body = (await res.json()) as { tokens: { idToken: string } };
  await app.request('/api/characters/me', {
    headers: { Authorization: `Bearer ${body.tokens.idToken}` },
  });
  return body.tokens.idToken;
};

const seedQuest = async (assignedCharacterId: string | null = null) =>
  prismaForTest.quest.create({
    data: {
      title: 'Doc Quest',
      description: 'desc',
      difficulty: 'NORMAL',
      rewardXp: 100,
      assignedCharacterId,
    },
  });

const uploadFile = async (
  app: ReturnType<typeof createServer>,
  token: string,
  questId: string,
  filename = 'note.txt',
  content = 'hello world',
  mimeType = 'text/plain',
) => {
  const form = new FormData();
  const blob = new Blob([content], { type: mimeType });
  form.append('file', blob, filename);
  return app.request(`/api/quests/${questId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
};

describe('Documents API', () => {
  const app = createServer();
  let storage: InMemoryStorageService;

  beforeEach(async () => {
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    __resetAuthProviderForTest();
    __resetStorageForTest();
    storage = new InMemoryStorageService();
    __setStorageForTest(storage);
    await resetDatabase();
  });

  afterAll(async () => {
    delete process.env.ADMIN_EMAILS;
    await prismaForTest.$disconnect();
  });

  it('uploads a document then lists own document', async () => {
    const token = await signup(app, USER_EMAIL);
    const quest = await seedQuest();

    const uploadRes = await uploadFile(app, token, quest.id);
    expect(uploadRes.status).toBe(201);
    const created = (await uploadRes.json()) as { id: string; status: string; filename: string };
    expect(created.status).toBe('PENDING');
    expect(created.filename).toBe('note.txt');

    expect(Array.from(storage.objects.keys()).length).toBe(1);

    const listRes = await app.request(`/api/quests/${quest.id}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = (await listRes.json()) as Array<{ id: string }>;
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(created.id);
  });

  it('uploading without file returns 400', async () => {
    const token = await signup(app, USER_EMAIL);
    const quest = await seedQuest();
    const form = new FormData();
    form.append('not-file', 'something');
    const res = await app.request(`/api/quests/${quest.id}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it('cannot upload to a quest assigned to another character', async () => {
    const userToken = await signup(app, USER_EMAIL);
    await signup(app, 'other@example.com');
    const otherEmployee = await prismaForTest.employee.findFirst({
      where: { email: 'other@example.com' },
    });
    const otherCharacter = await prismaForTest.character.findUnique({
      where: { employeeId: otherEmployee!.id },
    });
    const quest = await seedQuest(otherCharacter!.id);
    const res = await uploadFile(app, userToken, quest.id);
    expect(res.status).toBe(403);
  });

  it('admin sees all documents in pending list, then approves', async () => {
    const userToken = await signup(app, USER_EMAIL);
    const adminToken = await signup(app, ADMIN_EMAIL);
    const quest = await seedQuest();
    const uploadRes = await uploadFile(app, userToken, quest.id);
    const doc = (await uploadRes.json()) as { id: string };

    const pendingRes = await app.request('/api/admin/documents/pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(pendingRes.status).toBe(200);
    const pending = (await pendingRes.json()) as Array<{ id: string }>;
    expect(pending.find((d) => d.id === doc.id)).toBeTruthy();

    const approveRes = await app.request(`/api/admin/documents/${doc.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()) as { status: string };
    expect(approved.status).toBe('APPROVED');
  });

  it('non-admin cannot list pending', async () => {
    const userToken = await signup(app, USER_EMAIL);
    const res = await app.request('/api/admin/documents/pending', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('admin rejects with reason', async () => {
    const userToken = await signup(app, USER_EMAIL);
    const adminToken = await signup(app, ADMIN_EMAIL);
    const quest = await seedQuest();
    const uploadRes = await uploadFile(app, userToken, quest.id);
    const doc = (await uploadRes.json()) as { id: string };

    const rejectRes = await app.request(`/api/admin/documents/${doc.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Wrong format' }),
    });
    expect(rejectRes.status).toBe(200);
    const rejected = (await rejectRes.json()) as { status: string; rejectionReason: string };
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Wrong format');
  });

  it('download returns URL for owner', async () => {
    const userToken = await signup(app, USER_EMAIL);
    const quest = await seedQuest();
    const uploadRes = await uploadFile(app, userToken, quest.id);
    const doc = (await uploadRes.json()) as { id: string };

    const dlRes = await app.request(`/api/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(dlRes.status).toBe(200);
    const result = (await dlRes.json()) as { url: string };
    expect(result.url.startsWith('memory://')).toBe(true);
  });

  it('non-owner non-admin cannot download', async () => {
    const userToken = await signup(app, USER_EMAIL);
    const otherToken = await signup(app, 'other2@example.com');
    const quest = await seedQuest();
    const uploadRes = await uploadFile(app, userToken, quest.id);
    const doc = (await uploadRes.json()) as { id: string };

    const dlRes = await app.request(`/api/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    expect(dlRes.status).toBe(403);
  });
});
