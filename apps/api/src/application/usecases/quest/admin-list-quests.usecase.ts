import type { QuestDto } from '@/application/dto/quest.dto';
import type { Character } from '@/domain/entities/character.entity';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { QuestRepository } from '@/domain/repositories/quest.repository';

import { toQuestDto } from '@/application/usecases/quest/list-quests.usecase';

/**
 * 管理者専用: 全クエスト一覧 (status 問わず) + アサイン先キャラ情報 enrich
 */
export class AdminListQuestsUseCase {
  constructor(
    private readonly quests: QuestRepository,
    private readonly characters: CharacterRepository,
  ) {}

  async execute(): Promise<QuestDto[]> {
    const list = await this.quests.listAll();
    const assignedIds = Array.from(
      new Set(list.map((q) => q.assignedCharacterId).filter((v): v is string => !!v)),
    );
    const charById = new Map<string, Character>();
    await Promise.all(
      assignedIds.map(async (id) => {
        const c = await this.characters.findById(id);
        if (c) charById.set(id, c);
      }),
    );
    return list.map((q) => toQuestDto(q, charById));
  }
}
