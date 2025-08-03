import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';

import { DEFAULT_TIMEOUT } from '~/config/constants';
import { logger } from '~/utils/logger';

type HttpClientOptions = {
  payload?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
};

function getRandomUserAgent() {
  const osOptions = [
    'Windows NT 10.0; Win64; x64',
    'Macintosh; Intel Mac OS X 10_15_7',
    'X11; Linux x86_64',
  ];

  const chromeVersions = [
    '91.0.4472.124',
    '92.0.4515.107',
    '93.0.4577.63',
    '94.0.4606.71',
    '95.0.4638.69',
  ];

  const os = osOptions[Math.floor(Math.random() * osOptions.length)];
  const chromeVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];

  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Edg/91.0.864.67`;
}

axiosRetry(axios, {
  retries: 1,
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
    'User-Agent': getRandomUserAgent(),
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
      const axiosError = err as AxiosError;
      logger.error(
        `[${HttpClient.request.name}] Request failed ${axiosError.message} ${JSON.stringify(axiosError)}`
      );
      throw err;
    }
  }
}
