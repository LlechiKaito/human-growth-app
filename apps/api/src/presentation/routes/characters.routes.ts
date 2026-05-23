import { Hono } from 'hono';

import { GetMyCharacterUseCase } from '@/application/usecases/character/get-my-character.usecase';
import { HTTP_STATUS } from '@/constants/http-status';

import { prisma } from '@/infrastructure/db/prisma.client';
import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';

import { authMiddleware } from '@/presentation/middlewares/auth.middleware';

export const characterRoutes = new Hono()
  .use('*', authMiddleware)
  .get('/me', async (c) => {
    const sub = c.get('cognitoSub');
    const usecase = new GetMyCharacterUseCase(
      prisma,
      new EmployeePrismaRepository(prisma),
      new CharacterPrismaRepository(prisma),
    );
    const result = await usecase.execute(sub);
    return c.json(result, HTTP_STATUS.OK);
  });
