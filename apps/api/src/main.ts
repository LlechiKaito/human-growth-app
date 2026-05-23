import { serve } from '@hono/node-server';

import { env } from '@/config/env';
import { createServer } from '@/presentation/server';

const app = createServer();

serve(
  {
    fetch: app.fetch,
    port: env.API_PORT,
  },
  (info) => {
    console.log(`API listening on http://localhost:${info.port}`);
  },
);
