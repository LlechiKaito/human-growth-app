import type { DocumentDto } from '@/application/dto/document.dto';
import type { QuestDocument } from '@/domain/entities/quest-document.entity';

export const toDocumentDto = (d: QuestDocument): DocumentDto => ({
  id: d.id,
  questId: d.questId,
  uploadedByCharacterId: d.uploadedByCharacterId,
  filename: d.filename,
  mimeType: d.mimeType,
  sizeBytes: d.sizeBytes,
  status: d.status,
  reviewedAt: d.reviewedAt ? d.reviewedAt.toISOString() : null,
  rejectionReason: d.rejectionReason,
  createdAt: d.createdAt.toISOString(),
});
