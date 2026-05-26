import type { PrismaClient } from '@prisma/client';

import { QuestVideo, QuestVideoView } from '@/domain/entities/quest-video.entity';
import type { QuestVideoRepository } from '@/domain/repositories/quest-video.repository';

type VideoRow = {
  id: string;
  questId: string;
  s3Key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByEmployeeId: string;
  createdAt: Date;
  updatedAt: Date;
};

export class QuestVideoPrismaRepository implements QuestVideoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByQuestId(questId: string): Promise<QuestVideo | null> {
    const row = await this.prisma.questVideo.findUnique({ where: { questId } });
    return row ? this.toEntity(row) : null;
  }

  async upsert(video: QuestVideo): Promise<QuestVideo> {
    const row = await this.prisma.questVideo.upsert({
      where: { questId: video.questId },
      create: {
        id: video.id,
        questId: video.questId,
        s3Key: video.s3Key,
        filename: video.filename,
        mimeType: video.mimeType,
        sizeBytes: video.sizeBytes,
        uploadedByEmployeeId: video.uploadedByEmployeeId,
      },
      update: {
        s3Key: video.s3Key,
        filename: video.filename,
        mimeType: video.mimeType,
        sizeBytes: video.sizeBytes,
        uploadedByEmployeeId: video.uploadedByEmployeeId,
      },
    });
    return this.toEntity(row);
  }

  async deleteByQuestId(questId: string): Promise<QuestVideo | null> {
    const existing = await this.prisma.questVideo.findUnique({ where: { questId } });
    if (!existing) return null;
    await this.prisma.questVideo.delete({ where: { questId } });
    return this.toEntity(existing);
  }

  async recordView(view: QuestVideoView): Promise<QuestVideoView> {
    const row = await this.prisma.questVideoView.upsert({
      where: {
        questId_characterId: { questId: view.questId, characterId: view.characterId },
      },
      create: {
        questId: view.questId,
        characterId: view.characterId,
        viewedAt: view.viewedAt,
      },
      update: { viewedAt: view.viewedAt },
    });
    return QuestVideoView.create({
      questId: row.questId,
      characterId: row.characterId,
      viewedAt: row.viewedAt,
    });
  }

  async hasViewed(questId: string, characterId: string): Promise<boolean> {
    const row = await this.prisma.questVideoView.findUnique({
      where: { questId_characterId: { questId, characterId } },
      select: { questId: true },
    });
    return row !== null;
  }

  private toEntity(row: VideoRow): QuestVideo {
    return QuestVideo.create({
      id: row.id,
      questId: row.questId,
      s3Key: row.s3Key,
      filename: row.filename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedByEmployeeId: row.uploadedByEmployeeId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
