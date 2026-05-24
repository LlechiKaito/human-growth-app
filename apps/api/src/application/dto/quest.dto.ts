import type {
  Quest,
  QuestDifficulty,
  QuestRequirement,
  QuestStatus,
} from '@/domain/entities/quest.entity';

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
}

export const toQuestDto = (q: Quest): QuestDto => ({
  id: q.id,
  title: q.title,
  description: q.description,
  difficulty: q.difficulty,
  rewardXp: q.rewardXp.toNumber(),
  status: q.status,
  assignedCharacterId: q.assignedCharacterId,
  documentRequirement: q.documentRequirement,
  testRequirement: q.testRequirement,
});

export interface CompleteQuestResultDto {
  quest: QuestDto;
  gainedXp: number;
  newExperiencePoint: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}
