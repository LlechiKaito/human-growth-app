import { ERROR_CODES } from '@/constants/error-codes';
import type {
  Quest,
  QuestDifficulty,
  QuestRequirement,
} from '@/domain/entities/quest.entity';
import { QuestNotFoundError } from '@/domain/errors/domain-errors';
import type { QuestRepository } from '@/domain/repositories/quest.repository';

export interface AdminUpdateQuestInput {
  title?: string;
  description?: string;
  difficulty?: QuestDifficulty;
  rewardXp?: number;
  assignedCharacterId?: string | null;
  documentRequirement?: QuestRequirement;
  testRequirement?: QuestRequirement;
  videoRequirement?: QuestRequirement;
}

/**
 * 管理者専用: クエストのメタ情報を更新
 * status は更新しない (完了処理は別ユースケース)
 */
export class AdminUpdateQuestUseCase {
  constructor(private readonly quests: QuestRepository) {}

  async execute(id: string, input: AdminUpdateQuestInput): Promise<Quest> {
    const existing = await this.quests.findById(id);
    if (!existing) throw new QuestNotFoundError(id);
    if (input.rewardXp !== undefined && input.rewardXp < 0) {
      throw new Error(ERROR_CODES.VALIDATION_FAILED);
    }
    return this.quests.updateMeta(id, input);
  }
}
