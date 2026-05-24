import type { PrismaClient } from '@prisma/client';

import { QuestDocument, type DocumentStatus } from '@/domain/entities/quest-document.entity';
import type { QuestDocumentRepository } from '@/domain/repositories/quest-document.repository';

type Row = {
  id: string;
  questId: string;
  uploadedByCharacterId: string;
  s3Key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  reviewedByEmployeeId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toEntity = (row: Row): QuestDocument =>
  QuestDocument.create({
    id: row.id,
    questId: row.questId,
    uploadedByCharacterId: row.uploadedByCharacterId,
    s3Key: row.s3Key,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    status: row.status,
    reviewedByEmployeeId: row.reviewedByEmployeeId,
    reviewedAt: row.reviewedAt,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

export class QuestDocumentPrismaRepository implements QuestDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<QuestDocument | null> {
    const row = await this.prisma.questDocument.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async listByQuestId(questId: string): Promise<QuestDocument[]> {
    const rows = await this.prisma.questDocument.findMany({
      where: { questId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEntity);
  }

  async listByStatus(status: DocumentStatus): Promise<QuestDocument[]> {
    const rows = await this.prisma.questDocument.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEntity);
  }

  async create(d: QuestDocument): Promise<QuestDocument> {
    const row = await this.prisma.questDocument.create({
      data: {
        id: d.id,
        questId: d.questId,
        uploadedByCharacterId: d.uploadedByCharacterId,
        s3Key: d.s3Key,
        filename: d.filename,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        status: d.status,
      },
    });
    return toEntity(row);
  }

  async updateStatus(
    id: string,
    fields: {
      status: DocumentStatus;
      reviewedByEmployeeId: string;
      reviewedAt: Date;
      rejectionReason?: string | null;
    },
  ): Promise<QuestDocument> {
    const row = await this.prisma.questDocument.update({
      where: { id },
      data: {
        status: fields.status,
        reviewedByEmployeeId: fields.reviewedByEmployeeId,
        reviewedAt: fields.reviewedAt,
        rejectionReason: fields.rejectionReason ?? null,
      },
    });
    return toEntity(row);
  }
}
