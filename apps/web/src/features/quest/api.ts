import { API_PATHS } from '@/constants/api-paths';
import { httpClient } from '@/lib/http-client';

export interface QuestDto {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'EPIC';
  rewardXp: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  assignedCharacterId: string | null;
}

export const fetchQuests = async (): Promise<QuestDto[]> => {
  const { data } = await httpClient.get<QuestDto[]>(API_PATHS.QUESTS);
  return data;
};

export const completeQuest = async (questId: string): Promise<QuestDto> => {
  const { data } = await httpClient.post<QuestDto>(API_PATHS.QUEST_COMPLETE(questId));
  return data;
};
