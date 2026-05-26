import { Hono } from 'hono';

import { CompleteQuestUseCase } from '@/application/usecases/quest/complete-quest.usecase';
import { ListQuestsUseCase } from '@/application/usecases/quest/list-quests.usecase';
import { HTTP_STATUS } from '@/constants/http-status';

import { prisma } from '@/infrastructure/db/prisma.client';
import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';
import { QuestTestPrismaRepository } from '@/infrastructure/repositories/quest-test.prisma.repository';
import { QuestVideoPrismaRepository } from '@/infrastructure/repositories/quest-video.prisma.repository';
import { QuestPrismaRepository } from '@/infrastructure/repositories/quest.prisma.repository';

import { authMiddleware } from '@/presentation/middlewares/auth.middleware';

export const questRoutes = new Hono()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const sub = c.get('cognitoSub');
    const usecase = new ListQuestsUseCase(
      new EmployeePrismaRepository(prisma),
      new CharacterPrismaRepository(prisma),
      new QuestPrismaRepository(prisma),
      new QuestTestPrismaRepository(prisma),
      new QuestVideoPrismaRepository(prisma),
    );
    const list = await usecase.execute(sub);
    return c.json(list, HTTP_STATUS.OK);
  })
  .post('/:id/complete', async (c) => {
    const sub = c.get('cognitoSub');
    const questId = c.req.param('id');
    const usecase = new CompleteQuestUseCase(prisma);
    const result = await usecase.execute(sub, questId);
    return c.json(result, HTTP_STATUS.OK);
  });
