import type { QuestDto } from '@/application/dto/quest.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import type { Character } from '@/domain/entities/character.entity';
import type { Quest } from '@/domain/entities/quest.entity';
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

    // assignedCharacterId に対応する Character を一括取得 (アバター表示用)
    const assignedIds = Array.from(
      new Set(quests.map((q) => q.assignedCharacterId).filter((v): v is string => !!v)),
    );
    const charById = new Map<string, Character>();
    await Promise.all(
      assignedIds.map(async (id) => {
        const c = await this.characters.findById(id);
        if (c) charById.set(id, c);
      }),
    );

    return quests.map((q) => toQuestDto(q, charById));
  }
}

export const toQuestDto = (q: Quest, charById: Map<string, Character>): QuestDto => {
  const c = q.assignedCharacterId ? charById.get(q.assignedCharacterId) ?? null : null;
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    difficulty: q.difficulty,
    rewardXp: q.rewardXp.toNumber(),
    status: q.status,
    assignedCharacterId: q.assignedCharacterId,
    assignedCharacterName: c?.name ?? null,
    assignedCharacterClass: c?.className ?? null,
    assignedCharacterLevel: c?.level ?? null,
  };
};
