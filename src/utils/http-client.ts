import axios from 'axios';
import randUserAgent from 'rand-user-agent';

import * as config from '~/config/default';

export default class HttpClient {
  static defaultHeaders = {
    'Accept-Encoding': 'gzip',
    'User-Agent': randUserAgent('desktop', 'chrome'),
  };

  static async get(url: string, auth: boolean = false) {
    const headers = {
      ...HttpClient.defaultHeaders,
      ...(auth
        ? {
            'User-Agent': `${config.services.spotify.clientVersion} (Macintosh; Apple Silicon)`,
            // Authorization: `Bearer ${await getOrUpdateSpotifyAccessToken()}`,
          }
        : {}),
    };

    const { data } = await axios.get(url, {
      headers,
      timeout: 6000,
      signal: AbortSignal.timeout(2000),
    });

    return data;
  }
}
