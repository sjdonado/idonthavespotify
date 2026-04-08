import { spyOn } from 'bun:test';

import HttpClient, { HttpClientError } from '~/utils/http-client';

type ReplyCallback = (config: { data: string }) => [number, unknown];

interface MockEntry {
  pattern: string | RegExp;
  reply: [number, unknown] | ReplyCallback;
}

export class HttpMock {
  private getMocks: MockEntry[] = [];
  private postMocks: MockEntry[] = [];
  private getSpy: ReturnType<typeof spyOn> | null = null;
  private postSpy: ReturnType<typeof spyOn> | null = null;
  private resolveRedirectSpy: ReturnType<typeof spyOn> | null = null;

  constructor() {
    this.setup();
  }

  private setup() {
    this.getSpy = spyOn(HttpClient, 'get').mockImplementation(
      (async (url: string) => this.matchAndReply('GET', url)) as typeof HttpClient.get
    );
    this.postSpy = spyOn(HttpClient, 'post').mockImplementation(
      (async (url: string, payload: unknown) =>
        this.matchAndReply('POST', url, payload)) as typeof HttpClient.post
    );
    this.resolveRedirectSpy = spyOn(HttpClient, 'resolveRedirect').mockImplementation(
      async (url: string) => url
    );
  }

  private matchAndReply(method: string, url: string, payload?: unknown): unknown {
    const mocks = method === 'GET' ? this.getMocks : this.postMocks;

    for (const entry of mocks) {
      const matches =
        typeof entry.pattern === 'string'
          ? url.includes(entry.pattern)
          : entry.pattern.test(url);

      if (matches) {
        if (typeof entry.reply === 'function') {
          const serialized =
            typeof payload === 'string' ? payload : JSON.stringify(payload);
          const [status, data] = entry.reply({ data: serialized });
          if (![200, 201, 204].includes(status)) {
            throw new HttpClientError(`Mock: ${status}`, status, '', url);
          }
          return data;
        }
        const [status, data] = entry.reply;
        if (![200, 201, 204].includes(status)) {
          throw new HttpClientError(`Mock: ${status}`, status, '', url);
        }
        return data;
      }
    }

    throw new HttpClientError(`No mock for ${method} ${url}`, 404, 'Not Found', url);
  }

  onGet(pattern: string | RegExp) {
    return {
      reply: (status: number, data?: unknown) => {
        this.getMocks.push({ pattern, reply: [status, data] });
      },
    };
  }

  onPost(pattern: string | RegExp) {
    return {
      reply: (statusOrCallback: number | ReplyCallback, data?: unknown) => {
        if (typeof statusOrCallback === 'function') {
          this.postMocks.push({ pattern, reply: statusOrCallback });
        } else {
          this.postMocks.push({ pattern, reply: [statusOrCallback, data] });
        }
      },
    };
  }

  reset() {
    this.getMocks = [];
    this.postMocks = [];
  }

  restore() {
    this.reset();
    this.getSpy?.mockRestore();
    this.postSpy?.mockRestore();
    this.resolveRedirectSpy?.mockRestore();
  }
}
