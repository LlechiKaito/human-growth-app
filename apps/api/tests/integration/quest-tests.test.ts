import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { __resetAuthProviderForTest } from '@/infrastructure/auth';
import { createServer } from '@/presentation/server';

import { prismaForTest, resetDatabase } from './helpers/db';

const ADMIN_EMAIL = 'admin@example.com';

interface AuthCtx {
  token: string;
  characterId: string;
}

const signup = async (
  app: ReturnType<typeof createServer>,
  email: string,
): Promise<AuthCtx> => {
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

interface AdminTestDto {
  questId: string;
  questions: {
    id: string;
    text: string;
    order: number;
    choices: { id: string; text: string; order: number; isCorrect: boolean }[];
  }[];
}

const seedQuestWithTest = async (
  app: ReturnType<typeof createServer>,
  adminToken: string,
  testRequirement: 'NONE' | 'OPTIONAL' | 'REQUIRED' = 'REQUIRED',
  assignedCharacterId: string | null = null,
): Promise<{ questId: string; test: AdminTestDto }> => {
  const auth = { Authorization: `Bearer ${adminToken}` };
  const createRes = await app.request('/api/admin/quests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({
      title: 'Test Quest',
      rewardXp: 100,
      testRequirement,
      assignedCharacterId,
    }),
  });
  const { id: questId } = (await createRes.json()) as { id: string };

  const upsertRes = await app.request(`/api/admin/quests/${questId}/test`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({
      questions: [
        {
          text: 'What is 1+1?',
          choices: [
            { text: '1', isCorrect: false },
            { text: '2', isCorrect: true },
            { text: '3', isCorrect: false },
          ],
        },
        {
          text: 'What color is the sky?',
          choices: [
            { text: 'Red', isCorrect: false },
            { text: 'Blue', isCorrect: true },
          ],
        },
      ],
    }),
  });
  const test = (await upsertRes.json()) as AdminTestDto;
  return { questId, test };
};

describe('Quest Test (Quiz) API', () => {
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

  describe('admin upsert', () => {
    it('admin can create a test (questions + choices)', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { questId, test } = await seedQuestWithTest(app, adminToken);
      expect(test.questId).toBe(questId);
      expect(test.questions.length).toBe(2);
      expect(test.questions[0].choices.length).toBe(3);
      expect(test.questions[0].choices.filter((c) => c.isCorrect).length).toBe(1);
    });

    it('admin can replace existing questions', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { questId } = await seedQuestWithTest(app, adminToken);

      const auth = { Authorization: `Bearer ${adminToken}` };
      const res = await app.request(`/api/admin/quests/${questId}/test`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          questions: [
            {
              text: 'Only question',
              choices: [
                { text: 'A', isCorrect: true },
                { text: 'B', isCorrect: false },
              ],
            },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AdminTestDto;
      expect(body.questions.length).toBe(1);
      expect(body.questions[0].text).toBe('Only question');
    });

    it('rejects question with 2 correct choices', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const createRes = await app.request('/api/admin/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ title: 'Q', rewardXp: 50 }),
      });
      const { id } = (await createRes.json()) as { id: string };

      const res = await app.request(`/api/admin/quests/${id}/test`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          questions: [
            {
              text: 'Two corrects',
              choices: [
                { text: 'A', isCorrect: true },
                { text: 'B', isCorrect: true },
              ],
            },
          ],
        }),
      });
      expect(res.status).toBe(400);
    });

    it('non-admin cannot upsert', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { questId } = await seedQuestWithTest(app, adminToken);
      const { token: userToken } = await signup(app, 'user@example.com');

      const res = await app.request(`/api/admin/quests/${questId}/test`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ questions: [] }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('user fetch & submit', () => {
    it('GET /api/quests/:id/test returns questions without isCorrect', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { questId } = await seedQuestWithTest(app, adminToken);
      const { token: userToken } = await signup(app, 'user@example.com');

      const res = await app.request(`/api/quests/${questId}/test`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        questions: { choices: { isCorrect?: boolean }[] }[];
      };
      // isCorrect は受講者には返さない
      for (const q of body.questions) {
        for (const c of q.choices) {
          expect(c.isCorrect).toBeUndefined();
        }
      }
    });

    it('GET test returns 404 when no test configured', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const auth = { Authorization: `Bearer ${adminToken}` };
      const createRes = await app.request('/api/admin/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ title: 'NoTest', rewardXp: 50 }),
      });
      const { id } = (await createRes.json()) as { id: string };

      const { token: userToken } = await signup(app, 'user@example.com');
      const res = await app.request(`/api/quests/${id}/test`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(404);
    });

    it('correct answers → passed=true, score=total', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { questId, test } = await seedQuestWithTest(app, adminToken);
      const { token: userToken } = await signup(app, 'user@example.com');

      const answers = test.questions.map((q) => ({
        questionId: q.id,
        choiceId: q.choices.find((c) => c.isCorrect)!.id,
      }));

      const res = await app.request(`/api/quests/${questId}/test/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ answers }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        passed: boolean;
        score: number;
        total: number;
      };
      expect(body.passed).toBe(true);
      expect(body.score).toBe(2);
      expect(body.total).toBe(2);
    });

    it('one wrong → passed=false', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { questId, test } = await seedQuestWithTest(app, adminToken);
      const { token: userToken } = await signup(app, 'user@example.com');

      // 1問目は正解、2問目は不正解
      const answers = [
        {
          questionId: test.questions[0].id,
          choiceId: test.questions[0].choices.find((c) => c.isCorrect)!.id,
        },
        {
          questionId: test.questions[1].id,
          choiceId: test.questions[1].choices.find((c) => !c.isCorrect)!.id,
        },
      ];

      const res = await app.request(`/api/quests/${questId}/test/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ answers }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { passed: boolean; score: number };
      expect(body.passed).toBe(false);
      expect(body.score).toBe(1);
    });

    it('mismatched questionIds in answers → 400', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { questId } = await seedQuestWithTest(app, adminToken);
      const { token: userToken } = await signup(app, 'user@example.com');

      const res = await app.request(`/api/quests/${questId}/test/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          answers: [
            {
              questionId: '00000000-0000-0000-0000-000000000001',
              choiceId: '00000000-0000-0000-0000-000000000002',
            },
          ],
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('completion gate', () => {
    it('testRequirement=REQUIRED, not passed → 409', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { token: userToken, characterId } = await signup(app, 'gate@example.com');
      const { questId } = await seedQuestWithTest(app, adminToken, 'REQUIRED', characterId);

      const res = await app.request(`/api/quests/${questId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('QUEST_TEST_REQUIRED');
    });

    it('testRequirement=REQUIRED, passed → 200 (completion succeeds)', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { token: userToken, characterId } = await signup(app, 'gate2@example.com');
      const { questId, test } = await seedQuestWithTest(
        app,
        adminToken,
        'REQUIRED',
        characterId,
      );

      const answers = test.questions.map((q) => ({
        questionId: q.id,
        choiceId: q.choices.find((c) => c.isCorrect)!.id,
      }));
      await app.request(`/api/quests/${questId}/test/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ answers }),
      });

      const res = await app.request(`/api/quests/${questId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(200);
    });

    it('GET /api/quests includes hasPassedTest=true after passing', async () => {
      const { token: adminToken } = await signup(app, ADMIN_EMAIL);
      const { token: userToken, characterId } = await signup(app, 'has@example.com');
      const { questId, test } = await seedQuestWithTest(
        app,
        adminToken,
        'OPTIONAL',
        characterId,
      );

      const answers = test.questions.map((q) => ({
        questionId: q.id,
        choiceId: q.choices.find((c) => c.isCorrect)!.id,
      }));
      await app.request(`/api/quests/${questId}/test/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ answers }),
      });

      const listRes = await app.request('/api/quests', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const list = (await listRes.json()) as { id: string; hasPassedTest?: boolean }[];
      const target = list.find((q) => q.id === questId);
      expect(target?.hasPassedTest).toBe(true);
    });
  });
});
