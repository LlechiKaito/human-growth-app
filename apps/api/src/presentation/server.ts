import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { env } from '@/config/env';
import { errorHandler } from '@/presentation/middlewares/error-handler';
import { routes } from '@/presentation/routes';

export const createServer = () => {
  const app = new Hono();

  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: env.API_CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.route('/api', routes);

  app.onError(errorHandler);

  return app;
};

export type AppType = ReturnType<typeof createServer>;
