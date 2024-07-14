import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import randUserAgent from 'rand-user-agent';

import { DEFAULT_TIMEOUT } from '~/config/constants';

import { logger } from '~/utils/logger';

type HttpClientOptions = {
  payload?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
};

axiosRetry(axios, {
  retries: 2,
  retryCondition: error => {
    // Retry on network errors or 5xx status codes
    return axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error);
  },
  retryDelay: retryCount => {
    // Exponential backoff delay
    return retryCount * 1000;
  },
});

export default class HttpClient {
  static defaultHeaders = {
    'Accept-Encoding': 'gzip',
    'User-Agent': randUserAgent('desktop', 'chrome'),
  };

  static async get<T>(url: string, options?: HttpClientOptions) {
    logger.debug(`[HttpClient] GET - ${url}`);
    return HttpClient.request<T>('GET', url, options);
  }

  static async post<T>(url: string, payload: unknown, options: HttpClientOptions = {}) {
    logger.debug(`[HttpClient] POST - ${url}`);
    return HttpClient.request<T>('POST', url, { ...options, payload });
  }

  private static async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    options?: HttpClientOptions
  ): Promise<T> {
    const headers = {
      ...HttpClient.defaultHeaders,
      ...(options?.headers ?? {}),
    };

    try {
      const { status, data } = await axios.request({
        url,
        method,
        data: options?.payload,
        headers,
        timeout: options?.timeout ?? DEFAULT_TIMEOUT,
        signal: AbortSignal.timeout(options?.timeout ?? DEFAULT_TIMEOUT),
      });

      if (![200, 201, 204].includes(status)) {
        throw new AxiosError(`Unexpected status code: ${status}`);
      }

      return data as T;
    } catch (err) {
      logger.error(`[${HttpClient.request.name}] Request failed.`);
      logger.error(err);
      throw err;
    }
  }
}
