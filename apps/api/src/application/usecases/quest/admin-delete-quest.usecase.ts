import { QuestNotFoundError } from '@/domain/errors/domain-errors';
import type { QuestRepository } from '@/domain/repositories/quest.repository';

/**
 * 管理者専用: クエスト削除
 */
export class AdminDeleteQuestUseCase {
  constructor(private readonly quests: QuestRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.quests.findById(id);
    if (!existing) throw new QuestNotFoundError(id);
    await this.quests.delete(id);
  }
}
