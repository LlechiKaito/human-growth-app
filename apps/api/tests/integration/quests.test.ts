import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { __resetAuthProviderForTest } from '@/infrastructure/auth';
import { createServer } from '@/presentation/server';

import { prismaForTest, resetDatabase } from './helpers/db';

interface AuthCtx {
  token: string;
  characterId: string;
}

const bootstrapUser = async (
  app: ReturnType<typeof createServer>,
  email: string,
): Promise<AuthCtx> => {
  const signupRes = await app.request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'password123',
      displayName: 'Hero',
      department: 'Engineering',
    }),
  });
  const { tokens } = (await signupRes.json()) as { tokens: { idToken: string } };
  const charRes = await app.request('/api/characters/me', {
    headers: { Authorization: `Bearer ${tokens.idToken}` },
  });
  const character = (await charRes.json()) as { id: string };
  return { token: tokens.idToken, characterId: character.id };
};

const seedQuest = async (overrides: Partial<{ title: string; rewardXp: number; assignedCharacterId: string | null }> = {}) =>
  prismaForTest.quest.create({
    data: {
      title: overrides.title ?? 'Test Quest',
      description: 'Test description',
      difficulty: 'NORMAL',
      rewardXp: overrides.rewardXp ?? 100,
      assignedCharacterId: overrides.assignedCharacterId ?? null,
    },
  });

describe('Quests API', () => {
  const app = createServer();

  beforeEach(async () => {
    __resetAuthProviderForTest();
    await resetDatabase();
  });

  afterAll(async () => {
    await prismaForTest.$disconnect();
  });

  it('GET /quests returns assigned + open quests', async () => {
    const { token, characterId } = await bootstrapUser(app, 'q1@example.com');
    await seedQuest({ title: 'Assigned', assignedCharacterId: characterId });
    await seedQuest({ title: 'Open' });

    const res = await app.request('/api/quests', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ title: string }>;
    expect(body.map((q) => q.title).sort()).toEqual(['Assigned', 'Open']);
  });

  it('POST /quests/:id/complete grants XP and triggers level-up', async () => {
    const { token } = await bootstrapUser(app, 'q2@example.com');
    const quest = await seedQuest({ rewardXp: 150 });

    const res = await app.request(`/api/quests/${quest.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      gainedXp: number;
      newExperiencePoint: number;
      oldLevel: number;
      newLevel: number;
      leveledUp: boolean;
      quest: { status: string };
    };
    expect(body.gainedXp).toBe(150);
    expect(body.newExperiencePoint).toBe(150);
    expect(body.oldLevel).toBe(1);
    expect(body.newLevel).toBe(2);
    expect(body.leveledUp).toBe(true);
    expect(body.quest.status).toBe('COMPLETED');
  });

  it('POST /quests/:id/complete returns 409 if already completed', async () => {
    const { token } = await bootstrapUser(app, 'q3@example.com');
    const quest = await seedQuest({ rewardXp: 50 });

    const first = await app.request(`/api/quests/${quest.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(first.status).toBe(200);

    const second = await app.request(`/api/quests/${quest.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(second.status).toBe(409);
  });

  it('POST /quests/:id/complete returns 404 for unknown quest', async () => {
    const { token } = await bootstrapUser(app, 'q4@example.com');
    const res = await app.request('/api/quests/00000000-0000-0000-0000-000000000000/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('POST /quests/:id/complete returns 403 for other character quest', async () => {
    const { token } = await bootstrapUser(app, 'q5a@example.com');
    const other = await bootstrapUser(app, 'q5b@example.com');
    const quest = await seedQuest({ assignedCharacterId: other.characterId });

    const res = await app.request(`/api/quests/${quest.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  describe('completion requirements', () => {
    it('documentRequirement=REQUIRED blocks completion without APPROVED document', async () => {
      const { token, characterId } = await bootstrapUser(app, 'req1@example.com');
      const quest = await prismaForTest.quest.create({
        data: {
          title: 'Doc Required',
          description: '',
          difficulty: 'NORMAL',
          rewardXp: 100,
          assignedCharacterId: characterId,
          documentRequirement: 'REQUIRED',
        },
      });

      const res = await app.request(`/api/quests/${quest.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('QUEST_DOCUMENT_REQUIRED');
    });

    it('documentRequirement=REQUIRED blocks completion when only PENDING document exists', async () => {
      const { token, characterId } = await bootstrapUser(app, 'req2@example.com');
      const quest = await prismaForTest.quest.create({
        data: {
          title: 'Doc Required',
          description: '',
          difficulty: 'NORMAL',
          rewardXp: 100,
          assignedCharacterId: characterId,
          documentRequirement: 'REQUIRED',
        },
      });
      await prismaForTest.questDocument.create({
        data: {
          questId: quest.id,
          uploadedByCharacterId: characterId,
          s3Key: `quests/${quest.id}/pending.pdf`,
          filename: 'pending.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
          status: 'PENDING',
        },
      });

      const res = await app.request(`/api/quests/${quest.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(409);
    });

    it('documentRequirement=REQUIRED allows completion with APPROVED document', async () => {
      const { token, characterId } = await bootstrapUser(app, 'req3@example.com');
      const quest = await prismaForTest.quest.create({
        data: {
          title: 'Doc Required',
          description: '',
          difficulty: 'NORMAL',
          rewardXp: 100,
          assignedCharacterId: characterId,
          documentRequirement: 'REQUIRED',
        },
      });
      await prismaForTest.questDocument.create({
        data: {
          questId: quest.id,
          uploadedByCharacterId: characterId,
          s3Key: `quests/${quest.id}/ok.pdf`,
          filename: 'ok.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
          status: 'APPROVED',
        },
      });

      const res = await app.request(`/api/quests/${quest.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
    });

    it('documentRequirement=OPTIONAL allows completion without any document', async () => {
      const { token, characterId } = await bootstrapUser(app, 'req4@example.com');
      const quest = await prismaForTest.quest.create({
        data: {
          title: 'Doc Optional',
          description: '',
          difficulty: 'NORMAL',
          rewardXp: 100,
          assignedCharacterId: characterId,
          documentRequirement: 'OPTIONAL',
        },
      });

      const res = await app.request(`/api/quests/${quest.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
    });

    it('testRequirement=REQUIRED blocks completion (feature not implemented)', async () => {
      const { token, characterId } = await bootstrapUser(app, 'req5@example.com');
      const quest = await prismaForTest.quest.create({
        data: {
          title: 'Test Required',
          description: '',
          difficulty: 'NORMAL',
          rewardXp: 100,
          assignedCharacterId: characterId,
          testRequirement: 'REQUIRED',
        },
      });

      const res = await app.request(`/api/quests/${quest.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('QUEST_TEST_REQUIRED');
    });
  });
});
