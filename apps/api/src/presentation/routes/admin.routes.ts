import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { AdminListCharactersUseCase } from '@/application/usecases/character/admin-list-characters.usecase';
import { AdminCreateQuestUseCase } from '@/application/usecases/quest/admin-create-quest.usecase';
import { AdminDeleteQuestUseCase } from '@/application/usecases/quest/admin-delete-quest.usecase';
import { AdminListQuestsUseCase } from '@/application/usecases/quest/admin-list-quests.usecase';
import { AdminUpdateQuestUseCase } from '@/application/usecases/quest/admin-update-quest.usecase';
import { toQuestDto } from '@/application/usecases/quest/list-quests.usecase';
import { HTTP_STATUS } from '@/constants/http-status';
import type { Character } from '@/domain/entities/character.entity';
import type { Quest } from '@/domain/entities/quest.entity';

import { prisma } from '@/infrastructure/db/prisma.client';
import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
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

const quests = () => new QuestPrismaRepository(prisma);
const characters = () => new CharacterPrismaRepository(prisma);

const enrichSingle = async (q: Quest) => {
  const map = new Map<string, Character>();
  if (q.assignedCharacterId) {
    const c = await characters().findById(q.assignedCharacterId);
    if (c) map.set(c.id, c);
  }
  return toQuestDto(q, map);
};

export const adminRoutes = new Hono()
  .use('*', authMiddleware)
  .use('*', adminMiddleware)
  .get('/quests', async (c) => {
    const usecase = new AdminListQuestsUseCase(quests(), characters());
    const list = await usecase.execute();
    return c.json(list, HTTP_STATUS.OK);
  })
  .post('/quests', zValidator('json', createSchema), async (c) => {
    const input = c.req.valid('json');
    const usecase = new AdminCreateQuestUseCase(quests());
    const created = await usecase.execute(input);
    return c.json(await enrichSingle(created), HTTP_STATUS.CREATED);
  })
  .put('/quests/:id', zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const usecase = new AdminUpdateQuestUseCase(quests());
    const updated = await usecase.execute(id, input);
    return c.json(await enrichSingle(updated), HTTP_STATUS.OK);
  })
  .delete('/quests/:id', async (c) => {
    const id = c.req.param('id');
    const usecase = new AdminDeleteQuestUseCase(quests());
    await usecase.execute(id);
    return c.body(null, 204);
  })
  .get('/characters', async (c) => {
    const usecase = new AdminListCharactersUseCase(prisma, characters());
    const list = await usecase.execute();
    return c.json(list, HTTP_STATUS.OK);
  });
