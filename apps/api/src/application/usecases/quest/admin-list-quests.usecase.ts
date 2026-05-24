import { toQuestDto, type QuestDto } from '@/application/dto/quest.dto';
import type { QuestRepository } from '@/domain/repositories/quest.repository';

/**
 * 管理者専用: 全クエスト一覧 (status 問わず)
 */
export class AdminListQuestsUseCase {
  constructor(private readonly quests: QuestRepository) {}

  async execute(): Promise<QuestDto[]> {
    const list = await this.quests.listAll();
    return list.map(toQuestDto);
  }
}
