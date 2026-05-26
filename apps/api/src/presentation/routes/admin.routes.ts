import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { AdminListCharactersUseCase } from '@/application/usecases/character/admin-list-characters.usecase';
import { AdminListPendingDocumentsUseCase } from '@/application/usecases/document/admin-list-pending.usecase';
import { AdminReviewDocumentUseCase } from '@/application/usecases/document/admin-review-document.usecase';
import { AdminCreateQuestUseCase } from '@/application/usecases/quest/admin-create-quest.usecase';
import { AdminDeleteQuestUseCase } from '@/application/usecases/quest/admin-delete-quest.usecase';
import { AdminListQuestsUseCase } from '@/application/usecases/quest/admin-list-quests.usecase';
import { AdminUpdateQuestUseCase } from '@/application/usecases/quest/admin-update-quest.usecase';
import { AdminGetQuestTestUseCase } from '@/application/usecases/quest-test/admin-get-quest-test.usecase';
import { AdminUpsertQuestTestUseCase } from '@/application/usecases/quest-test/admin-upsert-quest-test.usecase';
import { AdminDeleteVideoUseCase } from '@/application/usecases/quest-video/admin-delete-video.usecase';
import { AdminGetVideoUseCase } from '@/application/usecases/quest-video/admin-get-video.usecase';
import { AdminUploadVideoUseCase } from '@/application/usecases/quest-video/admin-upload-video.usecase';
import { toQuestDto } from '@/application/dto/quest.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { HTTP_STATUS } from '@/constants/http-status';
import { DomainError } from '@/domain/errors/domain-errors';

import { prisma } from '@/infrastructure/db/prisma.client';
import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';
import { QuestDocumentPrismaRepository } from '@/infrastructure/repositories/quest-document.prisma.repository';
import { QuestTestPrismaRepository } from '@/infrastructure/repositories/quest-test.prisma.repository';
import { QuestVideoPrismaRepository } from '@/infrastructure/repositories/quest-video.prisma.repository';
import { QuestPrismaRepository } from '@/infrastructure/repositories/quest.prisma.repository';
import { getStorageService } from '@/infrastructure/storage';

import { adminMiddleware } from '@/presentation/middlewares/admin.middleware';
import { authMiddleware } from '@/presentation/middlewares/auth.middleware';

const DIFFICULTY = z.enum(['EASY', 'NORMAL', 'HARD', 'EPIC']);
const REQUIREMENT = z.enum(['NONE', 'OPTIONAL', 'REQUIRED']);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  difficulty: DIFFICULTY.default('NORMAL'),
  rewardXp: z.number().int().min(0).max(10000),
  assignedCharacterId: z.string().uuid().nullable().optional(),
  documentRequirement: REQUIREMENT.default('NONE'),
  testRequirement: REQUIREMENT.default('NONE'),
  videoRequirement: REQUIREMENT.default('NONE'),
});

const updateSchema = createSchema.partial();

const rejectSchema = z.object({
  reason: z.string().min(1).max(500),
});

const testUpsertSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        choices: z
          .array(z.object({ text: z.string().min(1).max(200), isCorrect: z.boolean() }))
          .min(2)
          .max(4),
      }),
    )
    .max(20),
});

const quests = () => new QuestPrismaRepository(prisma);
const documents = () => new QuestDocumentPrismaRepository(prisma);
const employees = () => new EmployeePrismaRepository(prisma);
const tests = () => new QuestTestPrismaRepository(prisma);
const videos = () => new QuestVideoPrismaRepository(prisma);

export const adminRoutes = new Hono()
  .use('*', authMiddleware)
  .use('*', adminMiddleware)
  .get('/quests', async (c) => {
    const usecase = new AdminListQuestsUseCase(quests());
    const list = await usecase.execute();
    return c.json(list, HTTP_STATUS.OK);
  })
  .post('/quests', zValidator('json', createSchema), async (c) => {
    const input = c.req.valid('json');
    const usecase = new AdminCreateQuestUseCase(quests());
    const created = await usecase.execute(input);
    return c.json(toQuestDto(created), HTTP_STATUS.CREATED);
  })
  .put('/quests/:id', zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const usecase = new AdminUpdateQuestUseCase(quests());
    const updated = await usecase.execute(id, input);
    return c.json(toQuestDto(updated), HTTP_STATUS.OK);
  })
  .delete('/quests/:id', async (c) => {
    const id = c.req.param('id');
    const usecase = new AdminDeleteQuestUseCase(quests());
    await usecase.execute(id);
    return c.body(null, 204);
  })
  .get('/characters', async (c) => {
    const usecase = new AdminListCharactersUseCase(
      prisma,
      new CharacterPrismaRepository(prisma),
    );
    const list = await usecase.execute();
    return c.json(list, HTTP_STATUS.OK);
  })
  .get('/documents/pending', async (c) => {
    const usecase = new AdminListPendingDocumentsUseCase(documents());
    const list = await usecase.execute();
    return c.json(list, HTTP_STATUS.OK);
  })
  .post('/documents/:id/approve', async (c) => {
    const sub = c.get('cognitoSub');
    const id = c.req.param('id');
    const usecase = new AdminReviewDocumentUseCase(documents(), employees());
    const result = await usecase.approve(sub, id);
    return c.json(result, HTTP_STATUS.OK);
  })
  .post('/documents/:id/reject', zValidator('json', rejectSchema), async (c) => {
    const sub = c.get('cognitoSub');
    const id = c.req.param('id');
    const { reason } = c.req.valid('json');
    const usecase = new AdminReviewDocumentUseCase(documents(), employees());
    const result = await usecase.reject(sub, id, reason);
    return c.json(result, HTTP_STATUS.OK);
  })
  .get('/quests/:id/test', async (c) => {
    const id = c.req.param('id');
    const usecase = new AdminGetQuestTestUseCase(quests(), tests());
    const result = await usecase.execute(id);
    return c.json(result, HTTP_STATUS.OK);
  })
  .put('/quests/:id/test', zValidator('json', testUpsertSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const usecase = new AdminUpsertQuestTestUseCase(quests(), tests());
    const result = await usecase.execute(id, input);
    return c.json(result, HTTP_STATUS.OK);
  })
  .get('/quests/:id/video', async (c) => {
    const id = c.req.param('id');
    const usecase = new AdminGetVideoUseCase(videos(), quests());
    const result = await usecase.execute(id);
    return c.json(result, HTTP_STATUS.OK);
  })
  .post('/quests/:id/video', async (c) => {
    const sub = c.get('cognitoSub');
    const questId = c.req.param('id');
    const form = await c.req.parseBody();
    const file = form['file'];
    if (!file || typeof file === 'string' || !(file instanceof File)) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_FAILED,
        'file field is required (multipart/form-data)',
      );
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    const usecase = new AdminUploadVideoUseCase(
      getStorageService(),
      videos(),
      quests(),
      employees(),
    );
    const result = await usecase.execute(sub, {
      questId,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      body: buffer,
    });
    return c.json(result, HTTP_STATUS.CREATED);
  })
  .delete('/quests/:id/video', async (c) => {
    const id = c.req.param('id');
    const usecase = new AdminDeleteVideoUseCase(getStorageService(), videos(), quests());
    await usecase.execute(id);
    return c.body(null, 204);
  });
