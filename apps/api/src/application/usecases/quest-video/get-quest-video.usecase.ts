import type { QuestVideoForViewerDto } from '@/application/dto/quest-video.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import {
  CharacterNotFoundError,
  DomainError,
} from '@/domain/errors/domain-errors';
import type { CharacterRepository } from '@/domain/repositories/character.repository';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestVideoRepository } from '@/domain/repositories/quest-video.repository';

import type { StorageService } from '@/infrastructure/storage/s3.service';

const PRESIGNED_TTL_SEC = 15 * 60; // 15 分

/**
 * 受講者向けに動画の presigned URL を返す。
 * 視聴済みフラグも一緒に返すので、UI は「視聴しました」ボタンの表示制御に使える。
 */
export class GetQuestVideoUseCase {
  constructor(
    private readonly storage: StorageService,
    private readonly videos: QuestVideoRepository,
    private readonly employees: EmployeeRepository,
    private readonly characters: CharacterRepository,
  ) {}

  async execute(cognitoSub: string, questId: string): Promise<QuestVideoForViewerDto> {
    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);
    const character = await this.characters.findByEmployeeId(employee.id);
    if (!character) throw new CharacterNotFoundError(employee.id);

    const video = await this.videos.findByQuestId(questId);
    if (!video) throw new DomainError(ERROR_CODES.QUEST_VIDEO_NOT_FOUND);

    const url = await this.storage.getDownloadUrl(video.s3Key, PRESIGNED_TTL_SEC);
    const viewed = await this.videos.hasViewed(questId, character.id);

    return {
      id: video.id,
      questId: video.questId,
      filename: video.filename,
      mimeType: video.mimeType,
      sizeBytes: video.sizeBytes,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      url,
      viewed,
    };
  }
}
