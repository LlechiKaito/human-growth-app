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
import { HTTP_STATUS } from '@/constants/http-status';
import type { Quest } from '@/domain/entities/quest.entity';

import { prisma } from '@/infrastructure/db/prisma.client';
import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';
import { QuestDocumentPrismaRepository } from '@/infrastructure/repositories/quest-document.prisma.repository';
import { QuestPrismaRepository } from '@/infrastructure/repositories/quest.prisma.repository';

import { adminMiddleware } from '@/presentation/middlewares/admin.middleware';
import { authMiddleware } from '@/presentation/middlewares/auth.middleware';

const DIFFICULTY = z.enum(['EASY', 'NORMAL', 'HARD', 'EPIC']);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  difficulty: DIFFICULTY.default('NORMAL'),
  rewardXp: z.number().int().min(0).max(10000),
  assignedCharacterId: z.string().uuid().nullable().optional(),
});

const updateSchema = createSchema.partial();

const rejectSchema = z.object({
  reason: z.string().min(1).max(500),
});

const quests = () => new QuestPrismaRepository(prisma);
const documents = () => new QuestDocumentPrismaRepository(prisma);
const employees = () => new EmployeePrismaRepository(prisma);

const toResponse = (q: Quest) => ({
  id: q.id,
  title: q.title,
  description: q.description,
  difficulty: q.difficulty,
  rewardXp: q.rewardXp.toNumber(),
  status: q.status,
  assignedCharacterId: q.assignedCharacterId,
});

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
    return c.json(toResponse(created), HTTP_STATUS.CREATED);
  })
  .put('/quests/:id', zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const usecase = new AdminUpdateQuestUseCase(quests());
    const updated = await usecase.execute(id, input);
    return c.json(toResponse(updated), HTTP_STATUS.OK);
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
  });
