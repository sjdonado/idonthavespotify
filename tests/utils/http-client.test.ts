import { describe, expect, it, mock } from 'bun:test';

// Edge-style backend: every fetch TypeError counts as transport (retryable).
let requests = 0;
mock.module('~/http-backend', () => ({
  createHttpBackend: () => ({
    request: async () => {
      requests++;
      throw new TypeError('Invalid URL');
    },
    resolveRedirect: async (url: string) => url,
    isTransportError: (error: unknown) => error instanceof TypeError,
  }),
}));

const { default: HttpClient } = await import('~/utils/http-client');

describe('HttpClient', () => {
  it('fails a malformed URL without reaching the backend or retrying', async () => {
    await expect(
      HttpClient.get('undefined/api.php?q=x', { retries: 2 })
    ).rejects.toBeInstanceOf(TypeError);
    expect(requests).toBe(0);
  });
});
