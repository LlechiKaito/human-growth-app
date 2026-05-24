import type { DownloadResultDto } from '@/application/dto/document.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError } from '@/domain/errors/domain-errors';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestDocumentRepository } from '@/domain/repositories/quest-document.repository';

import type { StorageService } from '@/infrastructure/storage/s3.service';

const DOWNLOAD_TTL_SEC = 300;

export class DownloadDocumentUseCase {
  constructor(
    private readonly storage: StorageService,
    private readonly documents: QuestDocumentRepository,
    private readonly employees: EmployeeRepository,
    private readonly characters: CharacterRepository,
  ) {}

  async execute(
    cognitoSub: string,
    isAdmin: boolean,
    documentId: string,
  ): Promise<DownloadResultDto> {
    const document = await this.documents.findById(documentId);
    if (!document) throw new DomainError(ERROR_CODES.NOT_FOUND, 'Document not found');

    if (!isAdmin) {
      const employee = await this.employees.findByCognitoSub(cognitoSub);
      if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);
      const character = await this.characters.findByEmployeeId(employee.id);
      if (!character || character.id !== document.uploadedByCharacterId) {
        throw new DomainError(ERROR_CODES.FORBIDDEN, 'Cannot access this document');
      }
    }

    const url = await this.storage.getDownloadUrl(document.s3Key, DOWNLOAD_TTL_SEC);
    return { url, expiresInSec: DOWNLOAD_TTL_SEC };
  }
}
