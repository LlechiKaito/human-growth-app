import type { PrismaClient } from '@prisma/client';

import type { CompleteQuestResultDto } from '@/application/dto/quest.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import {
  CharacterNotFoundError,
  DomainError,
  QuestAlreadyCompletedError,
  QuestNotFoundError,
} from '@/domain/errors/domain-errors';

import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';
import { QuestPrismaRepository } from '@/infrastructure/repositories/quest.prisma.repository';

export class CompleteQuestUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(cognitoSub: string, questId: string): Promise<CompleteQuestResultDto> {
    return this.prisma.$transaction(async (tx) => {
      const employees = new EmployeePrismaRepository(tx as PrismaClient);
      const characters = new CharacterPrismaRepository(tx as PrismaClient);
      const quests = new QuestPrismaRepository(tx as PrismaClient);

      const employee = await employees.findByCognitoSub(cognitoSub);
      if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);

      const character = await characters.findByEmployeeId(employee.id);
      if (!character) throw new CharacterNotFoundError(employee.id);

      const quest = await quests.findById(questId);
      if (!quest) throw new QuestNotFoundError(questId);
      if (quest.isCompleted()) throw new QuestAlreadyCompletedError(questId);
      if (quest.assignedCharacterId && quest.assignedCharacterId !== character.id) {
        throw new DomainError(ERROR_CODES.FORBIDDEN, 'Quest is assigned to another character');
      }

      const oldLevel = character.level;
      const updatedCharacter = character.gainExperience(quest.rewardXp);
      const newLevel = updatedCharacter.level;

      await characters.save(updatedCharacter);
      const completedQuest = await quests.save(quest.complete());

      return {
        quest: {
          id: completedQuest.id,
          title: completedQuest.title,
          description: completedQuest.description,
          difficulty: completedQuest.difficulty,
          rewardXp: completedQuest.rewardXp.toNumber(),
          status: completedQuest.status,
          assignedCharacterId: completedQuest.assignedCharacterId,
        },
        gainedXp: quest.rewardXp.toNumber(),
        newExperiencePoint: updatedCharacter.experience.toNumber(),
        oldLevel,
        newLevel,
        leveledUp: newLevel > oldLevel,
      };
    });
  }
}
