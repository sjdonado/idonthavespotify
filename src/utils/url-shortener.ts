import { ENV } from '~/config/env';

import { cacheShortenLink, getCachedShortenLink } from '~/services/cache';

import HttpClient from './http-client';
import { logger } from './logger';

interface ApiResponse {
  data: {
    id: string;
    refer: string;
    origin: string;
  };
}

export async function shortenLink(link: string) {
  const cache = await getCachedShortenLink(link);
  if (cache) {
    logger.info(`[url-shortener] (${link}) cache hit`);
    return cache;
  }

  let refer = link;

  try {
    const response = await HttpClient.post<ApiResponse>(
      ENV.utils.urlShortener.apiUrl,
      {
        url: link,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': ENV.utils.urlShortener.apiKey,
        },
      }
    );

    refer = response.data.refer;
    await cacheShortenLink(link, refer);
  } catch (err) {
    logger.error(`[url-shortener] (${link}) request failed ${err}`);
  }

  return refer;
}
