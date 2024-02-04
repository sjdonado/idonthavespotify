import axios from 'axios';
import randUserAgent from 'rand-user-agent';

type HttpClientOptions = {
  payload?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
};

const DEFAULT_TIMEOUT = 6000;

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

    const { data } = await axios.request({
      url,
      method,
      data: options?.payload,
      headers,
      timeout: options?.timeout ?? DEFAULT_TIMEOUT,
      signal: AbortSignal.timeout(options?.timeout ?? DEFAULT_TIMEOUT),
    });

    return data as T;
  }
}
