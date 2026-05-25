import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import {
  QuestChoice,
  QuestQuestion,
  QuestTestAttempt,
} from '@/domain/entities/quest-test.entity';
import type {
  QuestQuestionInput,
  QuestTestRepository,
} from '@/domain/repositories/quest-test.repository';

type ChoiceRow = {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
};

type QuestionRow = {
  id: string;
  questId: string;
  text: string;
  order: number;
  choices: ChoiceRow[];
};

type AttemptRow = {
  id: string;
  questId: string;
  characterId: string;
  score: number;
  total: number;
  passed: boolean;
  submittedAt: Date;
};

export class QuestTestPrismaRepository implements QuestTestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listQuestionsByQuestId(questId: string): Promise<QuestQuestion[]> {
    const rows = await this.prisma.questQuestion.findMany({
      where: { questId },
      include: { choices: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => this.toQuestion(r));
  }

  async replaceQuestions(
    questId: string,
    questions: QuestQuestionInput[],
  ): Promise<QuestQuestion[]> {
    await this.prisma.$transaction(async (tx) => {
      await tx.questQuestion.deleteMany({ where: { questId } });
      for (const q of questions) {
        await tx.questQuestion.create({
          data: {
            id: randomUUID(),
            questId,
            text: q.text,
            order: q.order,
            choices: {
              create: q.choices.map((c) => ({
                id: randomUUID(),
                text: c.text,
                isCorrect: c.isCorrect,
                order: c.order,
              })),
            },
          },
        });
      }
    });
    return this.listQuestionsByQuestId(questId);
  }

  async createAttempt(attempt: QuestTestAttempt): Promise<QuestTestAttempt> {
    const row = await this.prisma.questTestAttempt.create({
      data: {
        id: attempt.id,
        questId: attempt.questId,
        characterId: attempt.characterId,
        score: attempt.score,
        total: attempt.total,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
      },
    });
    return this.toAttempt(row);
  }

  async hasPassedAttempt(questId: string, characterId: string): Promise<boolean> {
    const row = await this.prisma.questTestAttempt.findFirst({
      where: { questId, characterId, passed: true },
      select: { id: true },
    });
    return row !== null;
  }

  async listAttempts(questId: string, characterId: string): Promise<QuestTestAttempt[]> {
    const rows = await this.prisma.questTestAttempt.findMany({
      where: { questId, characterId },
      orderBy: { submittedAt: 'desc' },
    });
    return rows.map((r) => this.toAttempt(r));
  }

  private toQuestion(row: QuestionRow): QuestQuestion {
    return QuestQuestion.create({
      id: row.id,
      questId: row.questId,
      text: row.text,
      order: row.order,
      choices: row.choices.map((c) =>
        QuestChoice.create({ id: c.id, text: c.text, isCorrect: c.isCorrect, order: c.order }),
      ),
    });
  }

  private toAttempt(row: AttemptRow): QuestTestAttempt {
    return QuestTestAttempt.create({
      id: row.id,
      questId: row.questId,
      characterId: row.characterId,
      score: row.score,
      total: row.total,
      passed: row.passed,
      submittedAt: row.submittedAt,
    });
  }
}
