import type { DocumentDto } from '@/application/dto/document.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError } from '@/domain/errors/domain-errors';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestDocumentRepository } from '@/domain/repositories/quest-document.repository';

import { toDocumentDto } from '@/application/usecases/document/to-document-dto';

export class AdminReviewDocumentUseCase {
  constructor(
    private readonly documents: QuestDocumentRepository,
    private readonly employees: EmployeeRepository,
  ) {}

  async approve(reviewerCognitoSub: string, documentId: string): Promise<DocumentDto> {
    return this.review(reviewerCognitoSub, documentId, 'APPROVED', null);
  }

  async reject(
    reviewerCognitoSub: string,
    documentId: string,
    reason: string,
  ): Promise<DocumentDto> {
    return this.review(reviewerCognitoSub, documentId, 'REJECTED', reason);
  }

  private async review(
    reviewerCognitoSub: string,
    documentId: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason: string | null,
  ): Promise<DocumentDto> {
    const existing = await this.documents.findById(documentId);
    if (!existing) throw new DomainError(ERROR_CODES.NOT_FOUND, 'Document not found');
    if (existing.status !== 'PENDING') {
      throw new DomainError(
        ERROR_CODES.CONFLICT,
        `Document is already ${existing.status}`,
      );
    }

    const reviewer = await this.employees.findByCognitoSub(reviewerCognitoSub);
    if (!reviewer) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);

    const updated = await this.documents.updateStatus(documentId, {
      status,
      reviewedByEmployeeId: reviewer.id,
      reviewedAt: new Date(),
      rejectionReason,
    });
    return toDocumentDto(updated);
  }
}
