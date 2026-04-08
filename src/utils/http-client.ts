import { Impit, TransportError } from 'impit';

import { DEFAULT_TIMEOUT } from '~/config/constants';
import { logger } from '~/utils/logger';

type HttpClientOptions = {
  payload?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
};

export class HttpClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public url: string,
    public retryAfter?: string
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

const client = new Impit({ browser: 'chrome', timeout: DEFAULT_TIMEOUT });

function isRetryable(error: unknown, status?: number): boolean {
  if (status === 429) return true;
  if (status && status >= 500) return true;
  if (error instanceof TransportError) return true;
  return false;
}

function getRetryDelay(attempt: number, retryAfter?: string | null): number {
  if (retryAfter) {
    return (parseInt(retryAfter, 10) + 1) * 1000;
  }
  return attempt * 1000;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error instanceof HttpClientError ? error.status : undefined;
      if (attempt < retries && isRetryable(error, status)) {
        const retryAfter =
          error instanceof HttpClientError ? error.retryAfter : undefined;
        const delay = getRetryDelay(attempt + 1, retryAfter);
        logger.debug(
          `[HttpClient] Retry ${attempt + 1}/${retries} after ${delay}ms`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function serializeBody(payload: unknown): string | URLSearchParams | undefined {
  if (payload === undefined || payload === null) return undefined;
  if (typeof payload === 'string') return payload;
  if (payload instanceof URLSearchParams) return payload;
  return JSON.stringify(payload);
}

export default class HttpClient {
  static async get<T>(url: string, options?: HttpClientOptions) {
    logger.debug(`[HttpClient] GET - ${url}`);
    return HttpClient.request<T>('GET', url, options);
  }

  static async post<T>(url: string, payload: unknown, options: HttpClientOptions = {}) {
    logger.debug(`[HttpClient] POST - ${url}`);
    return HttpClient.request<T>('POST', url, { ...options, payload });
  }

  static async resolveRedirect(url: string, maxRedirects: number = 10): Promise<string> {
    logger.debug(`[HttpClient] resolveRedirect - ${url}`);
    const redirectClient = new Impit({
      browser: 'chrome',
      followRedirects: true,
      maxRedirects,
      timeout: DEFAULT_TIMEOUT,
    });
    const response = await redirectClient.fetch(url);
    return response.url || url;
  }

  private static async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    options?: HttpClientOptions
  ): Promise<T> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const retries = options?.retries ?? 2;

    return withRetry(async () => {
      const response = await client.fetch(url, {
        method,
        headers: options?.headers,
        body: method !== 'GET' ? serializeBody(options?.payload) : undefined,
        timeout,
        signal: AbortSignal.timeout(timeout),
      });

      if (![200, 201, 204].includes(response.status)) {
        const retryAfter = response.headers.get('retry-after') ?? undefined;
        throw new HttpClientError(
          `Unexpected status code: ${response.status}`,
          response.status,
          response.statusText,
          url,
          retryAfter
        );
      }

      const contentType = response.headers.get('content-type') ?? '';
      let data: unknown;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return data as T;
    }, retries);
  }
}
