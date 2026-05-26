import { randomUUID } from 'node:crypto';

import type { QuestVideoMetaDto } from '@/application/dto/quest-video.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { QuestVideo } from '@/domain/entities/quest-video.entity';
import { DomainError, QuestNotFoundError } from '@/domain/errors/domain-errors';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import type { QuestRepository } from '@/domain/repositories/quest.repository';
import type { QuestVideoRepository } from '@/domain/repositories/quest-video.repository';

import type { StorageService } from '@/infrastructure/storage/s3.service';

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIMES = new Set(['video/mp4', 'video/webm']);

export interface AdminUploadVideoInput {
  questId: string;
  filename: string;
  mimeType: string;
  body: Uint8Array;
}

export class AdminUploadVideoUseCase {
  constructor(
    private readonly storage: StorageService,
    private readonly videos: QuestVideoRepository,
    private readonly quests: QuestRepository,
    private readonly employees: EmployeeRepository,
  ) {}

  async execute(cognitoSub: string, input: AdminUploadVideoInput): Promise<QuestVideoMetaDto> {
    if (!ALLOWED_MIMES.has(input.mimeType)) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_FAILED,
        `Unsupported video mime type: ${input.mimeType}`,
      );
    }
    if (input.body.byteLength > MAX_SIZE_BYTES) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_FAILED,
        `Video too large (max ${MAX_SIZE_BYTES} bytes)`,
      );
    }

    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);

    const quest = await this.quests.findById(input.questId);
    if (!quest) throw new QuestNotFoundError(input.questId);

    // 既存動画があれば S3 から削除 (DB の upsert で参照は上書きされるので、孤立 S3 オブジェクト掃除)
    const existing = await this.videos.findByQuestId(input.questId);
    if (existing) {
      await this.storage.delete(existing.s3Key).catch(() => undefined);
    }

    const id = randomUUID();
    const key = `videos/${input.questId}/${id}-${sanitize(input.filename)}`;
    await this.storage.upload({
      key,
      body: input.body,
      contentType: input.mimeType,
    });

    const now = new Date();
    const video = QuestVideo.create({
      id,
      questId: input.questId,
      s3Key: key,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.body.byteLength,
      uploadedByEmployeeId: employee.id,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.videos.upsert(video);

    return {
      id: saved.id,
      questId: saved.questId,
      filename: saved.filename,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
  }
}

const sanitize = (filename: string): string =>
  filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80) || 'video';
