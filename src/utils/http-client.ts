import axios from 'axios';
import axiosRetry from 'axios-retry';
import randUserAgent from 'rand-user-agent';

axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });

export default class HttpClient {
  static defaultHeaders = {
    'Accept-Encoding': 'gzip',
  };

  userAgent: string;

  constructor() {
    this.userAgent = randUserAgent('mobile');
  }

  async get(url: string) {
    const { data } = await axios.get(url, {
      headers: {
        ...HttpClient.defaultHeaders,
        'User-Agent': this.userAgent,
      },
    });

    return data;
  }
}
