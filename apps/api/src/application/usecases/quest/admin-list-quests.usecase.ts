import type { QuestDto } from '@/application/dto/quest.dto';
import type { QuestRepository } from '@/domain/repositories/quest.repository';

/**
 * 管理者専用: 全クエスト一覧 (status 問わず)
 */
export class AdminListQuestsUseCase {
  constructor(private readonly quests: QuestRepository) {}

  async execute(): Promise<QuestDto[]> {
    const list = await this.quests.listAll();
    return list.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      difficulty: q.difficulty,
      rewardXp: q.rewardXp.toNumber(),
      status: q.status,
      assignedCharacterId: q.assignedCharacterId,
    }));
  }
}
