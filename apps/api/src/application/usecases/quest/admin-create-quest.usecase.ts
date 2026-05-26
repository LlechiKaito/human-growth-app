import { randomUUID } from 'node:crypto';

import {
  Quest,
  type QuestDifficulty,
  type QuestRequirement,
} from '@/domain/entities/quest.entity';
import type { QuestRepository } from '@/domain/repositories/quest.repository';
import { ExperiencePoint } from '@/domain/value-objects/experience-point.vo';

export interface AdminCreateQuestInput {
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  rewardXp: number;
  assignedCharacterId?: string | null;
  documentRequirement?: QuestRequirement;
  testRequirement?: QuestRequirement;
  videoRequirement?: QuestRequirement;
}

/**
 * 管理者専用: 新規クエスト作成
 */
export class AdminCreateQuestUseCase {
  constructor(private readonly quests: QuestRepository) {}

  async execute(input: AdminCreateQuestInput): Promise<Quest> {
    const now = new Date();
    const quest = Quest.create({
      id: randomUUID(),
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      rewardXp: ExperiencePoint.create(input.rewardXp),
      status: 'OPEN',
      assignedCharacterId: input.assignedCharacterId ?? null,
      documentRequirement: input.documentRequirement ?? 'NONE',
      testRequirement: input.testRequirement ?? 'NONE',
      videoRequirement: input.videoRequirement ?? 'NONE',
      createdAt: now,
      updatedAt: now,
    });
    return this.quests.create(quest);
  }
}
