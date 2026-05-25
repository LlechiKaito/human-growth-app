import { randomUUID } from 'node:crypto';

import type { SubmitTestResultDto } from '@/application/dto/quest-test.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { QuestTestAttempt } from '@/domain/entities/quest-test.entity';
import {
  CharacterNotFoundError,
  DomainError,
} from '@/domain/errors/domain-errors';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestTestRepository } from '@/domain/repositories/quest-test.repository';

export interface SubmitTestInput {
  /** 設問 ID → 選択した選択肢 ID のマップ */
  answers: { questionId: string; choiceId: string }[];
}

/**
 * テストを採点し、attempt 行を保存する。
 * 合格 (passed=true) は **全問正解** のときのみ。
 */
export class SubmitQuestTestUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly characters: CharacterRepository,
    private readonly tests: QuestTestRepository,
  ) {}

  async execute(
    cognitoSub: string,
    questId: string,
    input: SubmitTestInput,
  ): Promise<SubmitTestResultDto> {
    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);

    const character = await this.characters.findByEmployeeId(employee.id);
    if (!character) throw new CharacterNotFoundError(employee.id);

    const questions = await this.tests.listQuestionsByQuestId(questId);
    if (questions.length === 0) throw new DomainError(ERROR_CODES.QUEST_TEST_NOT_FOUND);

    // 受信した answers の questionId 集合が、設問集合と一致するか検証
    const expectedIds = new Set(questions.map((q) => q.id));
    const receivedIds = new Set(input.answers.map((a) => a.questionId));
    if (
      expectedIds.size !== receivedIds.size ||
      [...expectedIds].some((id) => !receivedIds.has(id))
    ) {
      throw new DomainError(ERROR_CODES.QUEST_TEST_ANSWERS_INVALID);
    }

    const answerMap = new Map(input.answers.map((a) => [a.questionId, a.choiceId]));
    const results = questions.map((q) => {
      const userChoiceId = answerMap.get(q.id) ?? null;
      const isCorrect = userChoiceId !== null && q.isAnswerCorrect(userChoiceId);
      return {
        questionId: q.id,
        correctChoiceId: q.correctChoice()!.id,
        userChoiceId,
        isCorrect,
      };
    });

    const score = results.filter((r) => r.isCorrect).length;
    const total = questions.length;
    const passed = score === total;

    const attempt = QuestTestAttempt.create({
      id: randomUUID(),
      questId,
      characterId: character.id,
      score,
      total,
      passed,
      submittedAt: new Date(),
    });
    const saved = await this.tests.createAttempt(attempt);

    return {
      attemptId: saved.id,
      score,
      total,
      passed,
      results,
    };
  }
}
