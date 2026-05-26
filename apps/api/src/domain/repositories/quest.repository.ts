import type { Quest, QuestRequirement } from '@/domain/entities/quest.entity';

export interface QuestRepository {
  findById(id: string): Promise<Quest | null>;
  listAll(): Promise<Quest[]>;
  listAssignedTo(characterId: string): Promise<Quest[]>;
  create(quest: Quest): Promise<Quest>;
  save(quest: Quest): Promise<Quest>;
  delete(id: string): Promise<void>;
  updateMeta(id: string, fields: {
    title?: string;
    description?: string;
    difficulty?: Quest['difficulty'];
    rewardXp?: number;
    assignedCharacterId?: string | null;
    documentRequirement?: QuestRequirement;
    testRequirement?: QuestRequirement;
    videoRequirement?: QuestRequirement;
  }): Promise<Quest>;
}
