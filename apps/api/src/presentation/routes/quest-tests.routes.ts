import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { GetQuestTestUseCase } from '@/application/usecases/quest-test/get-quest-test.usecase';
import { SubmitQuestTestUseCase } from '@/application/usecases/quest-test/submit-quest-test.usecase';
import { HTTP_STATUS } from '@/constants/http-status';

import { prisma } from '@/infrastructure/db/prisma.client';
import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';
import { QuestTestPrismaRepository } from '@/infrastructure/repositories/quest-test.prisma.repository';
import { QuestPrismaRepository } from '@/infrastructure/repositories/quest.prisma.repository';

import { authMiddleware } from '@/presentation/middlewares/auth.middleware';

const submitSchema = z.object({
  answers: z
    .array(z.object({ questionId: z.string().uuid(), choiceId: z.string().uuid() }))
    .min(1)
    .max(20),
});

const quests = () => new QuestPrismaRepository(prisma);
const tests = () => new QuestTestPrismaRepository(prisma);
const employees = () => new EmployeePrismaRepository(prisma);
const characters = () => new CharacterPrismaRepository(prisma);

export const questTestRoutes = new Hono()
  .get('/quests/:questId/test', authMiddleware, async (c) => {
    const questId = c.req.param('questId');
    const usecase = new GetQuestTestUseCase(quests(), tests());
    const result = await usecase.execute(questId);
    return c.json(result, HTTP_STATUS.OK);
  })
  .post(
    '/quests/:questId/test/attempts',
    authMiddleware,
    zValidator('json', submitSchema),
    async (c) => {
      const sub = c.get('cognitoSub');
      const questId = c.req.param('questId');
      const input = c.req.valid('json');
      const usecase = new SubmitQuestTestUseCase(employees(), characters(), tests());
      const result = await usecase.execute(sub, questId, input);
      return c.json(result, HTTP_STATUS.OK);
    },
  );
