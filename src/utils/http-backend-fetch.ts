// Platform-fetch backend for runtimes without native addons (e.g. edge).
// Self-host keeps the Impit-based backend instead.
import { DEFAULT_TIMEOUT } from '~/config/constants';

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export type BackendInit = Omit<RequestInit, 'method' | 'body' | 'signal'> & {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: string | URLSearchParams;
  signal?: AbortSignal;
  timeout?: number;
};

export const createHttpBackend = () => ({
  request: (url: string, init: BackendInit) =>
    fetch(url, {
      ...init,
      headers: { 'User-Agent': CHROME_UA, ...(init.headers ?? {}) },
    }),
  resolveRedirect: async (url: string, maxRedirects = 10) => {
    let current = url;
    for (let i = 0; i < maxRedirects; i++) {
      const response = await fetch(current, {
        redirect: 'manual',
        headers: { 'User-Agent': CHROME_UA },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
      });
      await response.body?.cancel().catch(() => undefined);
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        try {
          current = new URL(location, current).toString();
        } catch {
          return current;
        }
        continue;
      }
      return current;
    }
    throw new Error(`[http-backend] exceeded ${maxRedirects} redirects for ${url}`);
  },
  isTransportError: (error: unknown) =>
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === 'TimeoutError'),
});
