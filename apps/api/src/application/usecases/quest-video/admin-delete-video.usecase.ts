import { QuestNotFoundError } from '@/domain/errors/domain-errors';
import type { QuestRepository } from '@/domain/repositories/quest.repository';
import type { QuestVideoRepository } from '@/domain/repositories/quest-video.repository';

import type { StorageService } from '@/infrastructure/storage/s3.service';

export class AdminDeleteVideoUseCase {
  constructor(
    private readonly storage: StorageService,
    private readonly videos: QuestVideoRepository,
    private readonly quests: QuestRepository,
  ) {}

  async execute(questId: string): Promise<void> {
    const quest = await this.quests.findById(questId);
    if (!quest) throw new QuestNotFoundError(questId);

    const deleted = await this.videos.deleteByQuestId(questId);
    if (deleted) {
      // S3 オブジェクトも削除 (失敗しても DB は一貫してる)
      await this.storage.delete(deleted.s3Key).catch(() => undefined);
    }
  }
}
