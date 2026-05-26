import { toQuestDto, type QuestDto } from '@/application/dto/quest.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError } from '@/domain/errors/domain-errors';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestRepository } from '@/domain/repositories/quest.repository';
import type { QuestTestRepository } from '@/domain/repositories/quest-test.repository';
import type { QuestVideoRepository } from '@/domain/repositories/quest-video.repository';

export class ListQuestsUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly characters: CharacterRepository,
    private readonly quests: QuestRepository,
    private readonly tests: QuestTestRepository,
    private readonly videos: QuestVideoRepository,
  ) {}

  async execute(cognitoSub: string): Promise<QuestDto[]> {
    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);

    const character = await this.characters.findByEmployeeId(employee.id);
    if (!character) throw new DomainError(ERROR_CODES.CHARACTER_NOT_FOUND);

    const quests = await this.quests.listAssignedTo(character.id);

    // 各要件についてユーザーの達成状況を並列取得
    const results = await Promise.all(
      quests.map(async (q) => {
        const dto = toQuestDto(q);
        if (q.testRequirement !== 'NONE') {
          dto.hasPassedTest = await this.tests.hasPassedAttempt(q.id, character.id);
        }
        if (q.videoRequirement !== 'NONE') {
          dto.hasViewedVideo = await this.videos.hasViewed(q.id, character.id);
        }
        return dto;
      }),
    );
    return results;
  }
}
