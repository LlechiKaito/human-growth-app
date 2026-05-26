import { ERROR_CODES } from '@/constants/error-codes';
import { QuestVideoView } from '@/domain/entities/quest-video.entity';
import {
  CharacterNotFoundError,
  DomainError,
} from '@/domain/errors/domain-errors';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestVideoRepository } from '@/domain/repositories/quest-video.repository';

export class MarkVideoViewedUseCase {
  constructor(
    private readonly videos: QuestVideoRepository,
    private readonly employees: EmployeeRepository,
    private readonly characters: CharacterRepository,
  ) {}

  async execute(cognitoSub: string, questId: string): Promise<{ viewed: true }> {
    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);
    const character = await this.characters.findByEmployeeId(employee.id);
    if (!character) throw new CharacterNotFoundError(employee.id);

    const video = await this.videos.findByQuestId(questId);
    if (!video) throw new DomainError(ERROR_CODES.QUEST_VIDEO_NOT_FOUND);

    await this.videos.recordView(
      QuestVideoView.create({
        questId,
        characterId: character.id,
        viewedAt: new Date(),
      }),
    );
    return { viewed: true };
  }
}
