import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { GetMeUseCase } from '@/application/usecases/auth/get-me.usecase';
import { LoginUseCase } from '@/application/usecases/auth/login.usecase';
import { SignupUseCase } from '@/application/usecases/auth/signup.usecase';
import { HTTP_STATUS } from '@/constants/http-status';

import { getAuthProvider } from '@/infrastructure/auth';
import { prisma } from '@/infrastructure/db/prisma.client';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';

import { authMiddleware } from '@/presentation/middlewares/auth.middleware';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(50),
  department: z.string().max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const employees = () => new EmployeePrismaRepository(prisma);

export const authRoutes = new Hono()
  .post('/signup', zValidator('json', signupSchema), async (c) => {
    const input = c.req.valid('json');
    const usecase = new SignupUseCase(getAuthProvider(), employees());
    const result = await usecase.execute(input);
    return c.json(result, HTTP_STATUS.CREATED);
  })
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const input = c.req.valid('json');
    const usecase = new LoginUseCase(getAuthProvider(), employees());
    const result = await usecase.execute(input);
    return c.json(result, HTTP_STATUS.OK);
  })
  .get('/me', authMiddleware, async (c) => {
    const usecase = new GetMeUseCase(employees());
    const me = await usecase.execute({
      cognitoSub: c.get('cognitoSub'),
      email: c.get('userEmail'),
      displayName: c.get('userDisplayName'),
      groups: c.get('userGroups'),
    });
    return c.json(me, HTTP_STATUS.OK);
  });
