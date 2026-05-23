import { Hono } from 'hono';

import { healthRoutes } from '@/presentation/routes/health.routes';

export const routes = new Hono().route('/health', healthRoutes);

export type AppRoutes = typeof routes;
