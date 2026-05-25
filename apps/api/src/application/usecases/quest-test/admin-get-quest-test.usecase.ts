import type { AdminQuestTestDto } from '@/application/dto/quest-test.dto';
import { QuestNotFoundError } from '@/domain/errors/domain-errors';
import type { QuestRepository } from '@/domain/repositories/quest.repository';
import type { QuestTestRepository } from '@/domain/repositories/quest-test.repository';

/**
 * 管理者向け: クエストのテスト設問を取得 (正解を含む)
 */
export class AdminGetQuestTestUseCase {
  constructor(
    private readonly quests: QuestRepository,
    private readonly tests: QuestTestRepository,
  ) {}

  async execute(questId: string): Promise<AdminQuestTestDto> {
    const quest = await this.quests.findById(questId);
    if (!quest) throw new QuestNotFoundError(questId);

    const questions = await this.tests.listQuestionsByQuestId(questId);
    return {
      questId,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        order: q.order,
        choices: q.choices.map((c) => ({
          id: c.id,
          text: c.text,
          order: c.order,
          isCorrect: c.isCorrect,
        })),
      })),
    };
  }
}
