import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { __resetAuthProviderForTest } from '@/infrastructure/auth';
import {
  __resetStorageForTest,
  __setStorageForTest,
} from '@/infrastructure/storage';
import { InMemoryStorageService } from '@/infrastructure/storage/s3.service';
import { createServer } from '@/presentation/server';

import { prismaForTest, resetDatabase } from './helpers/db';

const ADMIN_EMAIL = 'admin@example.com';

const signup = async (
  app: ReturnType<typeof createServer>,
  email: string,
): Promise<{ token: string; characterId: string }> => {
  const signupRes = await app.request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', displayName: 'Hero' }),
  });
  const { tokens } = (await signupRes.json()) as { tokens: { idToken: string } };
  const charRes = await app.request('/api/characters/me', {
    headers: { Authorization: `Bearer ${tokens.idToken}` },
  });
  const character = (await charRes.json()) as { id: string };
  return { token: tokens.idToken, characterId: character.id };
};

const createQuest = async (
  app: ReturnType<typeof createServer>,
  adminToken: string,
  body: Record<string, unknown>,
): Promise<string> => {
  const res = await app.request('/api/admin/quests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ title: 'Q', rewardXp: 50, ...body }),
  });
  const { id } = (await res.json()) as { id: string };
  return id;
};

const uploadVideo = async (
  app: ReturnType<typeof createServer>,
  adminToken: string,
  questId: string,
  filename = 'lesson.mp4',
  mimeType = 'video/mp4',
  size = 1024,
): Promise<Response> => {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(size)], { type: mimeType }), filename);
  return app.request(`/api/admin/quests/${questId}/video`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: form,
  });
};

describe('Quest Video API', () => {
  const app = createServer();

  beforeEach(async () => {
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    __resetAuthProviderForTest();
    __resetStorageForTest();
    __setStorageForTest(new InMemoryStorageService());
    await resetDatabase();
  });

  afterAll(async () => {
    delete process.env.ADMIN_EMAILS;
    await prismaForTest.$disconnect();
  });

  describe('admin upload / get / delete', () => {
    it('admin can upload a video', async () => {
      const { token } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, token, { videoRequirement: 'OPTIONAL' });
      const res = await uploadVideo(app, token, questId);
      expect(res.status).toBe(201);
      const body = (await res.json()) as { questId: string; filename: string; sizeBytes: number };
      expect(body.questId).toBe(questId);
      expect(body.filename).toBe('lesson.mp4');
      expect(body.sizeBytes).toBe(1024);
    });

    it('non-admin cannot upload', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, adminToken, { videoRequirement: 'OPTIONAL' });
      const { token: userToken } = await signup(app, 'user@example.com');
      const res = await uploadVideo(app, userToken, questId);
      expect(res.status).toBe(403);
    });

    it('rejects non-video mime type', async () => {
      const { token } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, token, { videoRequirement: 'OPTIONAL' });
      const res = await uploadVideo(app, token, questId, 'note.txt', 'text/plain');
      expect(res.status).toBe(400);
    });

    it('rejects too large file (>100MB)', async () => {
      const { token } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, token, { videoRequirement: 'OPTIONAL' });
      // 101MB
      const res = await uploadVideo(app, token, questId, 'big.mp4', 'video/mp4', 101 * 1024 * 1024);
      expect(res.status).toBe(400);
    });

    it('GET /api/admin/quests/:id/video returns null when no video', async () => {
      const { token } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, token, { videoRequirement: 'OPTIONAL' });
      const res = await app.request(`/api/admin/quests/${questId}/video`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toBeNull();
    });

    it('admin can delete the uploaded video', async () => {
      const { token } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, token, { videoRequirement: 'OPTIONAL' });
      await uploadVideo(app, token, questId);

      const delRes = await app.request(`/api/admin/quests/${questId}/video`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(delRes.status).toBe(204);

      const getRes = await app.request(`/api/admin/quests/${questId}/video`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await getRes.json();
      expect(body).toBeNull();
    });
  });

  describe('user fetch / mark viewed', () => {
    it('user can fetch video metadata + URL', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, adminToken, { videoRequirement: 'OPTIONAL' });
      await uploadVideo(app, adminToken, questId);

      const { token: userToken } = await signup(app, 'viewer@example.com');
      const res = await app.request(`/api/quests/${questId}/video`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { url: string; viewed: boolean };
      expect(body.url).toBeTypeOf('string');
      expect(body.viewed).toBe(false);
    });

    it('GET video returns 404 when no video', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, adminToken, { videoRequirement: 'OPTIONAL' });
      const { token: userToken } = await signup(app, 'viewer2@example.com');
      const res = await app.request(`/api/quests/${questId}/video`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(404);
    });

    it('mark viewed → viewed=true on next fetch', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, adminToken, { videoRequirement: 'OPTIONAL' });
      await uploadVideo(app, adminToken, questId);

      const { token: userToken } = await signup(app, 'viewer3@example.com');
      const viewRes = await app.request(`/api/quests/${questId}/video/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      });
      expect(viewRes.status).toBe(200);

      const getRes = await app.request(`/api/quests/${questId}/video`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const body = (await getRes.json()) as { viewed: boolean };
      expect(body.viewed).toBe(true);
    });

    it('mark viewed multiple times does not duplicate', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const questId = await createQuest(app, adminToken, { videoRequirement: 'OPTIONAL' });
      await uploadVideo(app, adminToken, questId);

      const { token: userToken, characterId } = await signup(app, 'viewer4@example.com');
      for (let i = 0; i < 3; i++) {
        await app.request(`/api/quests/${questId}/video/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        });
      }
      const count = await prismaForTest.questVideoView.count({
        where: { questId, characterId },
      });
      expect(count).toBe(1);
    });
  });

  describe('completion gate', () => {
    it('videoRequirement=REQUIRED, not viewed → 409', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { token: userToken, characterId } = await signup(app, 'gate@example.com');
      const questId = await createQuest(app, adminToken, {
        videoRequirement: 'REQUIRED',
        assignedCharacterId: characterId,
      });
      await uploadVideo(app, adminToken, questId);

      const res = await app.request(`/api/quests/${questId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('QUEST_VIDEO_REQUIRED');
    });

    it('videoRequirement=REQUIRED, viewed → completion succeeds', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { token: userToken, characterId } = await signup(app, 'gate2@example.com');
      const questId = await createQuest(app, adminToken, {
        videoRequirement: 'REQUIRED',
        assignedCharacterId: characterId,
      });
      await uploadVideo(app, adminToken, questId);

      await app.request(`/api/quests/${questId}/video/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      });

      const res = await app.request(`/api/quests/${questId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(200);
    });

    it('videoRequirement=OPTIONAL → completion succeeds without view', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { token: userToken, characterId } = await signup(app, 'opt@example.com');
      const questId = await createQuest(app, adminToken, {
        videoRequirement: 'OPTIONAL',
        assignedCharacterId: characterId,
      });

      const res = await app.request(`/api/quests/${questId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(200);
    });

    it('GET /api/quests includes hasViewedVideo', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { token: userToken, characterId } = await signup(app, 'list@example.com');
      const questId = await createQuest(app, adminToken, {
        videoRequirement: 'OPTIONAL',
        assignedCharacterId: characterId,
      });
      await uploadVideo(app, adminToken, questId);
      await app.request(`/api/quests/${questId}/video/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      });

      const res = await app.request('/api/quests', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const list = (await res.json()) as { id: string; hasViewedVideo?: boolean }[];
      const target = list.find((q) => q.id === questId);
      expect(target?.hasViewedVideo).toBe(true);
    });
  });
});
