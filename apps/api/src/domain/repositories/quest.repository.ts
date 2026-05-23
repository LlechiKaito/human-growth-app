import type { Quest } from '@/domain/entities/quest.entity';

export interface QuestRepository {
  findById(id: string): Promise<Quest | null>;
  listAll(): Promise<Quest[]>;
  listAssignedTo(characterId: string): Promise<Quest[]>;
  save(quest: Quest): Promise<Quest>;
}
