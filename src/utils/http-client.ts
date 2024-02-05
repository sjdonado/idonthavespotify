import axios from 'axios';
import randUserAgent from 'rand-user-agent';

import { DEFAULT_TIMEOUT } from '~/config/constants';

import { logger } from '~/utils/logger';

type HttpClientOptions = {
  payload?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
};

export default class HttpClient {
  static defaultHeaders = {
    'Accept-Encoding': 'gzip',
    'User-Agent': randUserAgent('desktop', 'chrome'),
  };

  static async get<T>(url: string, options?: HttpClientOptions) {
    return HttpClient.request<T>('GET', url, options);
  }

  static async post<T>(url: string, payload: unknown, options: HttpClientOptions = {}) {
    return HttpClient.request<T>('POST', url, { ...options, payload });
  }

  private static async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    options?: HttpClientOptions
  ) {
    const headers = {
      ...HttpClient.defaultHeaders,
      ...(options?.headers ?? {}),
    };

    const retries = options?.retries ?? 1;

    for (let i = 0; i < retries; i++) {
      try {
        const { data } = await axios.request({
          url,
          method,
          data: options?.payload,
          headers,
          timeout: options?.timeout ?? DEFAULT_TIMEOUT * (i + 1),
          signal: AbortSignal.timeout(options?.timeout ?? DEFAULT_TIMEOUT),
        });

        return data as T;
      } catch (err) {
        logger.error(`[${HttpClient.request.name}] Attempt ${i + 1} failed. Retrying...`);
        logger.error(err);

        await new Promise(res => setTimeout(res, 1000 * (i + 1)));
      }
    }

    throw new Error(
      `[${HttpClient.request.name}] Failed to fetch ${url} after ${retries} retries`
    );
  }
}
