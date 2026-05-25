import { API_PATHS } from '@/constants/api-paths';
import { httpClient } from '@/lib/http-client';

export type QuestDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EPIC';
export type QuestStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
export type QuestRequirement = 'NONE' | 'OPTIONAL' | 'REQUIRED';

export interface QuestDto {
  id: string;
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  rewardXp: number;
  status: QuestStatus;
  assignedCharacterId: string | null;
  documentRequirement: QuestRequirement;
  testRequirement: QuestRequirement;
  /**
   * `/api/quests` のみで返る。`/api/admin/quests` では undefined。
   * testRequirement === 'NONE' のときも undefined。
   */
  hasPassedTest?: boolean;
}

export interface CompleteQuestResult {
  quest: QuestDto;
  gainedXp: number;
  newExperiencePoint: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}

export const fetchQuests = async (): Promise<QuestDto[]> => {
  const { data } = await httpClient.get<QuestDto[]>(API_PATHS.QUESTS);
  return data;
};

export const completeQuest = async (questId: string): Promise<CompleteQuestResult> => {
  const { data } = await httpClient.post<CompleteQuestResult>(API_PATHS.QUEST_COMPLETE(questId));
  return data;
};
