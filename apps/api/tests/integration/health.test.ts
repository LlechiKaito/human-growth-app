import { describe, expect, it } from 'vitest';

import { createServer } from '@/presentation/server';

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const app = createServer();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });
});
