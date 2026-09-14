import { Impit, TransportError } from 'impit';

import { DEFAULT_TIMEOUT } from '~/config/constants';

export type BackendInit = Omit<RequestInit, 'method' | 'body' | 'signal'> & {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: string | URLSearchParams;
  signal?: AbortSignal;
  timeout?: number;
};

export const createHttpBackend = () => {
  const client = new Impit({ browser: 'chrome', timeout: DEFAULT_TIMEOUT });

  return {
    request: (url: string, init: BackendInit) => client.fetch(url, init),
    resolveRedirect: async (url: string, maxRedirects = 10) => {
      const redirectClient = new Impit({
        browser: 'chrome',
        followRedirects: true,
        maxRedirects,
        timeout: DEFAULT_TIMEOUT,
      });
      const response = await redirectClient.fetch(url);
      return response.url || url;
    },
    isTransportError: (error: unknown) => error instanceof TransportError,
  };
};
