import type { DocumentDto } from '@/application/dto/document.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError, QuestNotFoundError } from '@/domain/errors/domain-errors';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestDocumentRepository } from '@/domain/repositories/quest-document.repository';
import type { QuestRepository } from '@/domain/repositories/quest.repository';

import { toDocumentDto } from '@/application/usecases/document/to-document-dto';

export class ListDocumentsUseCase {
  constructor(
    private readonly documents: QuestDocumentRepository,
    private readonly quests: QuestRepository,
    private readonly employees: EmployeeRepository,
    private readonly characters: CharacterRepository,
  ) {}

  async execute(
    cognitoSub: string,
    isAdmin: boolean,
    questId: string,
  ): Promise<DocumentDto[]> {
    const quest = await this.quests.findById(questId);
    if (!quest) throw new QuestNotFoundError(questId);

    const list = await this.documents.listByQuestId(questId);
    if (isAdmin) return list.map(toDocumentDto);

    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);
    const character = await this.characters.findByEmployeeId(employee.id);
    if (!character) throw new DomainError(ERROR_CODES.CHARACTER_NOT_FOUND);

    return list
      .filter((d) => d.uploadedByCharacterId === character.id)
      .map(toDocumentDto);
  }
}
