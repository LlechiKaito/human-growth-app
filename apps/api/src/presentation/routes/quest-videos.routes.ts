import { Hono } from 'hono';

import { GetQuestVideoUseCase } from '@/application/usecases/quest-video/get-quest-video.usecase';
import { MarkVideoViewedUseCase } from '@/application/usecases/quest-video/mark-video-viewed.usecase';
import { HTTP_STATUS } from '@/constants/http-status';

import { prisma } from '@/infrastructure/db/prisma.client';
import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';
import { QuestVideoPrismaRepository } from '@/infrastructure/repositories/quest-video.prisma.repository';
import { getStorageService } from '@/infrastructure/storage';

import { authMiddleware } from '@/presentation/middlewares/auth.middleware';

const employees = () => new EmployeePrismaRepository(prisma);
const characters = () => new CharacterPrismaRepository(prisma);
const videos = () => new QuestVideoPrismaRepository(prisma);

export const questVideoRoutes = new Hono()
  .get('/quests/:questId/video', authMiddleware, async (c) => {
    const sub = c.get('cognitoSub');
    const questId = c.req.param('questId');
    const usecase = new GetQuestVideoUseCase(
      getStorageService(),
      videos(),
      employees(),
      characters(),
    );
    const result = await usecase.execute(sub, questId);
    return c.json(result, HTTP_STATUS.OK);
  })
  .post('/quests/:questId/video/view', authMiddleware, async (c) => {
    const sub = c.get('cognitoSub');
    const questId = c.req.param('questId');
    const usecase = new MarkVideoViewedUseCase(videos(), employees(), characters());
    const result = await usecase.execute(sub, questId);
    return c.json(result, HTTP_STATUS.OK);
  });
