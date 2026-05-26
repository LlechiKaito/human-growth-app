import type { PrismaClient } from '@prisma/client';

import { toQuestDto, type CompleteQuestResultDto } from '@/application/dto/quest.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import {
  CharacterNotFoundError,
  DomainError,
  QuestAlreadyCompletedError,
  QuestNotFoundError,
} from '@/domain/errors/domain-errors';

import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';
import { QuestDocumentPrismaRepository } from '@/infrastructure/repositories/quest-document.prisma.repository';
import { QuestTestPrismaRepository } from '@/infrastructure/repositories/quest-test.prisma.repository';
import { QuestVideoPrismaRepository } from '@/infrastructure/repositories/quest-video.prisma.repository';
import { QuestPrismaRepository } from '@/infrastructure/repositories/quest.prisma.repository';

export class CompleteQuestUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(cognitoSub: string, questId: string): Promise<CompleteQuestResultDto> {
    return this.prisma.$transaction(async (tx) => {
      const employees = new EmployeePrismaRepository(tx as PrismaClient);
      const characters = new CharacterPrismaRepository(tx as PrismaClient);
      const quests = new QuestPrismaRepository(tx as PrismaClient);
      const documents = new QuestDocumentPrismaRepository(tx as PrismaClient);
      const tests = new QuestTestPrismaRepository(tx as PrismaClient);
      const videos = new QuestVideoPrismaRepository(tx as PrismaClient);

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

      // 完了ゲート: REQUIRED 要件を満たしていないと完了不可
      if (quest.documentRequirement === 'REQUIRED') {
        const docs = await documents.listByQuestId(questId);
        const hasApproved = docs.some(
          (d) => d.uploadedByCharacterId === character.id && d.status === 'APPROVED',
        );
        if (!hasApproved) throw new DomainError(ERROR_CODES.QUEST_DOCUMENT_REQUIRED);
      }
      if (quest.testRequirement === 'REQUIRED') {
        const passed = await tests.hasPassedAttempt(questId, character.id);
        if (!passed) throw new DomainError(ERROR_CODES.QUEST_TEST_REQUIRED);
      }
      if (quest.videoRequirement === 'REQUIRED') {
        const viewed = await videos.hasViewed(questId, character.id);
        if (!viewed) throw new DomainError(ERROR_CODES.QUEST_VIDEO_REQUIRED);
      }

      const oldLevel = character.level;
      const updatedCharacter = character.gainExperience(quest.rewardXp);
      const newLevel = updatedCharacter.level;

      await characters.save(updatedCharacter);
      const completedQuest = await quests.save(quest.complete());

      return {
        quest: toQuestDto(completedQuest),
        gainedXp: quest.rewardXp.toNumber(),
        newExperiencePoint: updatedCharacter.experience.toNumber(),
        oldLevel,
        newLevel,
        leveledUp: newLevel > oldLevel,
      };
    });
  }
}
