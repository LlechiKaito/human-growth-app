import type { PublicQuestTestDto } from '@/application/dto/quest-test.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError } from '@/domain/errors/domain-errors';
import type { QuestRepository } from '@/domain/repositories/quest.repository';
import type { QuestTestRepository } from '@/domain/repositories/quest-test.repository';

/**
 * 受講者向けにクエストのテストを取得する。
 * 正解 (isCorrect) はレスポンスから除外する。
 */
export class GetQuestTestUseCase {
  constructor(
    private readonly quests: QuestRepository,
    private readonly tests: QuestTestRepository,
  ) {}

  async execute(questId: string): Promise<PublicQuestTestDto> {
    const quest = await this.quests.findById(questId);
    if (!quest) throw new DomainError(ERROR_CODES.QUEST_NOT_FOUND);

    const questions = await this.tests.listQuestionsByQuestId(questId);
    if (questions.length === 0) throw new DomainError(ERROR_CODES.QUEST_TEST_NOT_FOUND);

    return {
      questId,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        order: q.order,
        choices: q.choices.map((c) => ({ id: c.id, text: c.text, order: c.order })),
      })),
    };
  }
}
