import { API_PATHS } from '@/constants/api-paths';
import type { QuestDifficulty, QuestDto } from '@/features/quest/api';
import { httpClient } from '@/lib/http-client';

export interface QuestUpsertInput {
  title: string;
  description?: string;
  difficulty?: QuestDifficulty;
  rewardXp: number;
  assignedCharacterId?: string | null;
}

export const adminListQuests = async (): Promise<QuestDto[]> => {
  const { data } = await httpClient.get<QuestDto[]>(API_PATHS.ADMIN_QUESTS);
  return data;
};

export const adminCreateQuest = async (input: QuestUpsertInput): Promise<QuestDto> => {
  const { data } = await httpClient.post<QuestDto>(API_PATHS.ADMIN_QUESTS, input);
  return data;
};

export const adminUpdateQuest = async (
  id: string,
  input: Partial<QuestUpsertInput>,
): Promise<QuestDto> => {
  const { data } = await httpClient.put<QuestDto>(API_PATHS.ADMIN_QUEST_BY_ID(id), input);
  return data;
};

export const adminDeleteQuest = async (id: string): Promise<void> => {
  await httpClient.delete(API_PATHS.ADMIN_QUEST_BY_ID(id));
};
