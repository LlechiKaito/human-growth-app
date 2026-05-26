import type { QuestVideo, QuestVideoView } from '@/domain/entities/quest-video.entity';

export interface QuestVideoRepository {
  findByQuestId(questId: string): Promise<QuestVideo | null>;
  upsert(video: QuestVideo): Promise<QuestVideo>;
  deleteByQuestId(questId: string): Promise<QuestVideo | null>;
  recordView(view: QuestVideoView): Promise<QuestVideoView>;
  hasViewed(questId: string, characterId: string): Promise<boolean>;
}
