import type { DocumentStatus, QuestDocument } from '@/domain/entities/quest-document.entity';

export interface QuestDocumentRepository {
  findById(id: string): Promise<QuestDocument | null>;
  listByQuestId(questId: string): Promise<QuestDocument[]>;
  listByStatus(status: DocumentStatus): Promise<QuestDocument[]>;
  create(document: QuestDocument): Promise<QuestDocument>;
  updateStatus(
    id: string,
    fields: {
      status: DocumentStatus;
      reviewedByEmployeeId: string;
      reviewedAt: Date;
      rejectionReason?: string | null;
    },
  ): Promise<QuestDocument>;
}
