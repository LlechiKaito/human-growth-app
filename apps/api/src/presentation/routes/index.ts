import { Hono } from 'hono';

import { authRoutes } from '@/presentation/routes/auth.routes';
import { characterRoutes } from '@/presentation/routes/characters.routes';
import { healthRoutes } from '@/presentation/routes/health.routes';

export const routes = new Hono()
  .route('/health', healthRoutes)
  .route('/auth', authRoutes)
  .route('/characters', characterRoutes);

export type AppRoutes = typeof routes;
