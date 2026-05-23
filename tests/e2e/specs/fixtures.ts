import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:8081';

export interface CreatedUser {
  email: string;
  password: string;
  idToken: string;
  characterId: string;
}

export const uniqueEmail = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;

const newApiContext = (): Promise<APIRequestContext> =>
  playwrightRequest.newContext({ baseURL: API_BASE_URL });

export const createUserViaApi = async (
  overrides: Partial<CreatedUser> = {},
): Promise<CreatedUser> => {
  const api = await newApiContext();
  const email = overrides.email ?? uniqueEmail('e2e');
  const password = overrides.password ?? 'password123';

  const signupRes = await api.post('/api/auth/signup', {
    data: { email, password, displayName: 'E2E User', department: 'Engineering' },
  });
  if (!signupRes.ok()) {
    throw new Error(`signup failed: ${signupRes.status()} ${await signupRes.text()}`);
  }
  const { tokens } = (await signupRes.json()) as { tokens: { idToken: string } };

  const charRes = await api.get('/api/characters/me', {
    headers: { Authorization: `Bearer ${tokens.idToken}` },
  });
  if (!charRes.ok()) {
    throw new Error(`character create failed: ${charRes.status()} ${await charRes.text()}`);
  }
  const character = (await charRes.json()) as { id: string };

  await api.dispose();
  return { email, password, idToken: tokens.idToken, characterId: character.id };
};

export const seedQuestViaApi = async (params: {
  title: string;
  rewardXp?: number;
  difficulty?: 'EASY' | 'NORMAL' | 'HARD' | 'EPIC';
  assignedCharacterId?: string | null;
}): Promise<{ id: string; title: string }> => {
  const api = await newApiContext();
  const res = await api.post('/api/_dev/quests', {
    data: {
      title: params.title,
      description: 'Seeded by E2E',
      rewardXp: params.rewardXp ?? 150,
      difficulty: params.difficulty ?? 'NORMAL',
      assignedCharacterId: params.assignedCharacterId ?? null,
    },
  });
  if (!res.ok()) {
    throw new Error(`seed quest failed: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { id: string; title: string };
  await api.dispose();
  return body;
};
