import { Hono } from 'hono';

import { authRoutes } from '@/presentation/routes/auth.routes';
import { characterRoutes } from '@/presentation/routes/characters.routes';
import { healthRoutes } from '@/presentation/routes/health.routes';
import { questRoutes } from '@/presentation/routes/quests.routes';

export const routes = new Hono()
  .route('/health', healthRoutes)
  .route('/auth', authRoutes)
  .route('/characters', characterRoutes)
  .route('/quests', questRoutes);

export type AppRoutes = typeof routes;
