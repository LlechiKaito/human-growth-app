import { toQuestDto, type QuestDto } from '@/application/dto/quest.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError } from '@/domain/errors/domain-errors';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestRepository } from '@/domain/repositories/quest.repository';

export class ListQuestsUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly characters: CharacterRepository,
    private readonly quests: QuestRepository,
  ) {}

  async execute(cognitoSub: string): Promise<QuestDto[]> {
    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);

    const character = await this.characters.findByEmployeeId(employee.id);
    if (!character) throw new DomainError(ERROR_CODES.CHARACTER_NOT_FOUND);

    const quests = await this.quests.listAssignedTo(character.id);
    return quests.map(toQuestDto);
  }
}
