import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { env } from '@/config/env';
import { ERROR_CODES } from '@/constants/error-codes';
import { HTTP_STATUS } from '@/constants/http-status';

import { prisma } from '@/infrastructure/db/prisma.client';

const createQuestSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  difficulty: z.enum(['EASY', 'NORMAL', 'HARD', 'EPIC']).default('NORMAL'),
  rewardXp: z.number().int().nonnegative().default(100),
  assignedCharacterId: z.string().uuid().nullable().optional(),
});

/**
 * Dev / E2E 向けの内部エンドポイント。
 * NODE_ENV=production では一切受け付けない。
 */
export const devRoutes = new Hono()
  .use('*', async (c, next) => {
    if (env.NODE_ENV === 'production') {
      return c.json({ code: ERROR_CODES.NOT_FOUND, message: 'Not found' }, HTTP_STATUS.NOT_FOUND);
    }
    return next();
  })
  .post('/quests', zValidator('json', createQuestSchema), async (c) => {
    const input = c.req.valid('json');
    const quest = await prisma.quest.create({
      data: {
        title: input.title,
        description: input.description,
        difficulty: input.difficulty,
        rewardXp: input.rewardXp,
        assignedCharacterId: input.assignedCharacterId ?? null,
      },
    });
    return c.json({ id: quest.id, title: quest.title }, HTTP_STATUS.CREATED);
  });
