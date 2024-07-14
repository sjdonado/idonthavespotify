import * as config from '~/config/default';

import HttpClient from './http-client';

interface ApiResponse {
  data: {
    id: string;
    refer: string;
    origin: string;
  };
}

export async function shortenLink(link: string) {
  const response = await HttpClient.post<ApiResponse>(
    config.utils.urlShortener.apiUrl,
    {
      url: link,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': config.utils.urlShortener.apiKey,
      },
    }
  );

  return response.data.refer;
}
