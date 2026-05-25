import type { AdminQuestTestDto } from '@/application/dto/quest-test.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError, QuestNotFoundError } from '@/domain/errors/domain-errors';
import type { QuestRepository } from '@/domain/repositories/quest.repository';
import type {
  QuestQuestionInput,
  QuestTestRepository,
} from '@/domain/repositories/quest-test.repository';

const MAX_QUESTIONS = 20;
const MAX_CHOICES = 4;
const MIN_CHOICES = 2;

export interface AdminUpsertQuestTestInput {
  questions: {
    text: string;
    choices: { text: string; isCorrect: boolean }[];
  }[];
}

/**
 * 管理者専用: クエストのテスト設問を**置き換え**形式で上書きする。
 * 単一選択のみ。1 設問につき正解は 1 つ、選択肢は 2-4 つ。設問は 0-20。
 * 0 設問で更新するとそのクエストのテストは削除される。
 */
export class AdminUpsertQuestTestUseCase {
  constructor(
    private readonly quests: QuestRepository,
    private readonly tests: QuestTestRepository,
  ) {}

  async execute(questId: string, input: AdminUpsertQuestTestInput): Promise<AdminQuestTestDto> {
    const quest = await this.quests.findById(questId);
    if (!quest) throw new QuestNotFoundError(questId);

    if (input.questions.length > MAX_QUESTIONS) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_FAILED,
        `Too many questions (max ${MAX_QUESTIONS})`,
      );
    }
    for (const [qi, q] of input.questions.entries()) {
      if (!q.text.trim()) {
        throw new DomainError(ERROR_CODES.VALIDATION_FAILED, `Question ${qi + 1} text is empty`);
      }
      if (q.choices.length < MIN_CHOICES || q.choices.length > MAX_CHOICES) {
        throw new DomainError(
          ERROR_CODES.VALIDATION_FAILED,
          `Question ${qi + 1} must have ${MIN_CHOICES}-${MAX_CHOICES} choices`,
        );
      }
      const correctCount = q.choices.filter((c) => c.isCorrect).length;
      if (correctCount !== 1) {
        throw new DomainError(
          ERROR_CODES.VALIDATION_FAILED,
          `Question ${qi + 1} must have exactly one correct choice`,
        );
      }
      if (q.choices.some((c) => !c.text.trim())) {
        throw new DomainError(
          ERROR_CODES.VALIDATION_FAILED,
          `Question ${qi + 1} has an empty choice`,
        );
      }
    }

    const repoInput: QuestQuestionInput[] = input.questions.map((q, qi) => ({
      text: q.text,
      order: qi,
      choices: q.choices.map((c, ci) => ({
        text: c.text,
        isCorrect: c.isCorrect,
        order: ci,
      })),
    }));

    const saved = await this.tests.replaceQuestions(questId, repoInput);

    return {
      questId,
      questions: saved.map((q) => ({
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
