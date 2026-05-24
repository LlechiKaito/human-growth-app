import { randomUUID } from 'node:crypto';

import type { DocumentDto, UploadDocumentInput } from '@/application/dto/document.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { QuestDocument } from '@/domain/entities/quest-document.entity';
import { DomainError, QuestNotFoundError } from '@/domain/errors/domain-errors';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestDocumentRepository } from '@/domain/repositories/quest-document.repository';
import type { QuestRepository } from '@/domain/repositories/quest.repository';

import type { StorageService } from '@/infrastructure/storage/s3.service';

import { toDocumentDto } from '@/application/usecases/document/to-document-dto';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_PREFIXES = ['application/', 'image/', 'text/', 'video/'];

export class UploadDocumentUseCase {
  constructor(
    private readonly storage: StorageService,
    private readonly documents: QuestDocumentRepository,
    private readonly quests: QuestRepository,
    private readonly employees: EmployeeRepository,
    private readonly characters: CharacterRepository,
  ) {}

  async execute(cognitoSub: string, input: UploadDocumentInput): Promise<DocumentDto> {
    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);

    const character = await this.characters.findByEmployeeId(employee.id);
    if (!character) throw new DomainError(ERROR_CODES.CHARACTER_NOT_FOUND);

    const quest = await this.quests.findById(input.questId);
    if (!quest) throw new QuestNotFoundError(input.questId);
    if (quest.assignedCharacterId && quest.assignedCharacterId !== character.id) {
      throw new DomainError(ERROR_CODES.FORBIDDEN, 'Quest is assigned to another character');
    }

    if (input.body.byteLength === 0) {
      throw new DomainError(ERROR_CODES.VALIDATION_FAILED, 'File is empty');
    }
    if (input.body.byteLength > MAX_BYTES) {
      throw new DomainError(ERROR_CODES.VALIDATION_FAILED, `File too large (> ${MAX_BYTES} bytes)`);
    }
    const allowed = ALLOWED_PREFIXES.some((p) => input.mimeType.startsWith(p));
    if (!allowed) {
      throw new DomainError(ERROR_CODES.VALIDATION_FAILED, `Unsupported mime type: ${input.mimeType}`);
    }

    const id = randomUUID();
    const s3Key = `quests/${input.questId}/${id}/${sanitize(input.filename)}`;

    await this.storage.upload({
      key: s3Key,
      body: input.body,
      contentType: input.mimeType,
    });

    const now = new Date();
    const document = QuestDocument.create({
      id,
      questId: input.questId,
      uploadedByCharacterId: character.id,
      s3Key,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.body.byteLength,
      status: 'PENDING',
      reviewedByEmployeeId: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.documents.create(document);
    return toDocumentDto(saved);
  }
}

const sanitize = (filename: string): string =>
  filename.replace(/[^\w.\-]+/g, '_').slice(0, 200);
