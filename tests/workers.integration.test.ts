import { describe, expect, it } from 'bun:test';

import worker from '~/workers';

// The real edge handler receives its settings per request, not from ambient test configuration.
delete process.env['DISABLE_API_SEARCH'];

describe('Worker API access', () => {
  it('applies the explicit API setting per request and ignores the retired provider key', async () => {
    const cases = [
      { env: { DISABLE_API_SEARCH: 'true' }, status: 403 },
      { env: { DISABLE_API_SEARCH: 'false' }, status: 400 },
      { env: { DISABLE_API_SEARCH: ' TRUE ' }, status: 403 },
      { env: {}, status: 400 },
      { env: { PLUNK_API_KEY: 'unused-fixture-key' }, status: 400 },
    ];

    for (const { env, status } of cases) {
      const response = await worker.fetch(
        new Request('https://example.test/api/search?v=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ link: 'invalid' }),
        }),
        env
      );
      // Open requests reach validation without an upstream call; disabled requests stop before it.
      expect(response.status).toBe(status);
    }
  });

  it('denies disabled API requests before parsing their body', async () => {
    const response = await worker.fetch(
      new Request('https://example.test/api/search?v=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
      { DISABLE_API_SEARCH: 'true' }
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'API search is disabled on the public instance.',
      auth: 'api-key',
    });
  });

  it('leaves web search open and preserves retired login responses when API search is disabled', async () => {
    const env = { DISABLE_API_SEARCH: 'true' };
    const home = await worker.fetch(new Request('https://example.test/'), env);
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('id="song-link"');

    for (const endpoint of ['request-code', 'verify-code']) {
      const response = await worker.fetch(
        new Request(`https://example.test/api/auth/${endpoint}`, { method: 'POST' }),
        env
      );
      expect(response.status).toBe(410);
    }
  });
});
