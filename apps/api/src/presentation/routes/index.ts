import { Hono } from 'hono';

import { env } from '@/config/env';

import { authRoutes } from '@/presentation/routes/auth.routes';
import { characterRoutes } from '@/presentation/routes/characters.routes';
import { devRoutes } from '@/presentation/routes/dev.routes';
import { healthRoutes } from '@/presentation/routes/health.routes';
import { questRoutes } from '@/presentation/routes/quests.routes';

const base = new Hono()
  .route('/health', healthRoutes)
  .route('/auth', authRoutes)
  .route('/characters', characterRoutes)
  .route('/quests', questRoutes);

export const routes =
  env.NODE_ENV === 'production' ? base : base.route('/_dev', devRoutes);

export type AppRoutes = typeof routes;
