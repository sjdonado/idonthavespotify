import { ENV } from '~/config/env';

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

  return response.data.refer;
}
