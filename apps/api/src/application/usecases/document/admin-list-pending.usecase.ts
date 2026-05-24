import type { DocumentDto } from '@/application/dto/document.dto';
import type { QuestDocumentRepository } from '@/domain/repositories/quest-document.repository';

import { toDocumentDto } from '@/application/usecases/document/to-document-dto';

export class AdminListPendingDocumentsUseCase {
  constructor(private readonly documents: QuestDocumentRepository) {}

  async execute(): Promise<DocumentDto[]> {
    const list = await this.documents.listByStatus('PENDING');
    return list.map(toDocumentDto);
  }
}
