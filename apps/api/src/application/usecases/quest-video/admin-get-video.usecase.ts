import type { QuestVideoMetaDto } from '@/application/dto/quest-video.dto';
import { QuestNotFoundError } from '@/domain/errors/domain-errors';
import type { QuestRepository } from '@/domain/repositories/quest.repository';
import type { QuestVideoRepository } from '@/domain/repositories/quest-video.repository';

export class AdminGetVideoUseCase {
  constructor(
    private readonly videos: QuestVideoRepository,
    private readonly quests: QuestRepository,
  ) {}

  async execute(questId: string): Promise<QuestVideoMetaDto | null> {
    const quest = await this.quests.findById(questId);
    if (!quest) throw new QuestNotFoundError(questId);

    const video = await this.videos.findByQuestId(questId);
    if (!video) return null;

    return {
      id: video.id,
      questId: video.questId,
      filename: video.filename,
      mimeType: video.mimeType,
      sizeBytes: video.sizeBytes,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
    };
  }
}
