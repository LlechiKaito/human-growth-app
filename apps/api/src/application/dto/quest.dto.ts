import type { QuestDifficulty, QuestStatus } from '@/domain/entities/quest.entity';

export interface QuestDto {
  id: string;
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  rewardXp: number;
  status: QuestStatus;
  assignedCharacterId: string | null;
  /** assignedCharacterId が non-null の時のみセットされる (アバター表示用) */
  assignedCharacterName: string | null;
  assignedCharacterClass: string | null;
  assignedCharacterLevel: number | null;
}

export interface CompleteQuestResultDto {
  quest: QuestDto;
  gainedXp: number;
  newExperiencePoint: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}
