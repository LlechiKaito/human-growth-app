import { Hono } from 'hono';

import { authRoutes } from '@/presentation/routes/auth.routes';
import { healthRoutes } from '@/presentation/routes/health.routes';

export const routes = new Hono()
  .route('/health', healthRoutes)
  .route('/auth', authRoutes);

export type AppRoutes = typeof routes;
