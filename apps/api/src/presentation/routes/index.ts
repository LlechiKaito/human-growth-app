import { Hono } from 'hono';

import { env } from '@/config/env';

import { adminRoutes } from '@/presentation/routes/admin.routes';
import { authRoutes } from '@/presentation/routes/auth.routes';
import { characterRoutes } from '@/presentation/routes/characters.routes';
import { devRoutes } from '@/presentation/routes/dev.routes';
import { documentRoutes } from '@/presentation/routes/documents.routes';
import { healthRoutes } from '@/presentation/routes/health.routes';
import { questTestRoutes } from '@/presentation/routes/quest-tests.routes';
import { questRoutes } from '@/presentation/routes/quests.routes';

const base = new Hono()
  .route('/health', healthRoutes)
  .route('/auth', authRoutes)
  .route('/characters', characterRoutes)
  .route('/quests', questRoutes)
  .route('/', documentRoutes)
  .route('/', questTestRoutes)
  .route('/admin', adminRoutes);

export const routes =
  env.NODE_ENV === 'production' ? base : base.route('/_dev', devRoutes);

export type AppRoutes = typeof routes;
