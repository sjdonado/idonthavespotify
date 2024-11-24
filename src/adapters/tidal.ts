import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import {
  cacheSearchResultLink,
  cacheTidalAccessToken,
  getCachedSearchResultLink,
  getCachedTidalAccessToken,
} from '~/services/cache';
import { SearchMetadata, SearchResultLink } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

interface TidalAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface TidalSearchResponse {
  data: Array<{
    id: string;
    type: string;
  }>;
}

const TIDAL_SEARCH_TYPES = {
  [MetadataType.Song]: 'tracks',
  [MetadataType.Album]: 'albums',
  [MetadataType.Playlist]: 'playlists',
  [MetadataType.Artist]: 'artists',
  [MetadataType.Show]: '',
  [MetadataType.Podcast]: '',
};

export async function getTidalLink(query: string, metadata: SearchMetadata) {
  const searchType = TIDAL_SEARCH_TYPES[metadata.type];

  if (!searchType) {
    return null;
  }

  const params = new URLSearchParams({
    countryCode: 'US',
  });

  const url = new URL(
    `${ENV.adapters.tidal.apiUrl}/${encodeURIComponent(query)}/relationships/${searchType}`
  );
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(url);
  if (cache) {
    logger.info(`[Tidal] (${url}) cache hit`);
    return cache;
  }

  try {
    const response = await HttpClient.get<TidalSearchResponse>(url.toString(), {
      headers: {
        Authorization: `Bearer ${await getOrUpdateTidalAccessToken()}`,
      },
    });

    const data = response.data;

    if (data.length === 0) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    const { id, type } = data[0];

    const searchResultLink = {
      type: Adapter.Tidal,
      url: `${ENV.adapters.tidal.baseUrl}/${type.slice(0, -1)}/${id}`,
      isVerified: type === searchType,
    } as SearchResultLink;

    await cacheSearchResultLink(url, searchResultLink);

    return searchResultLink;
  } catch (error) {
    logger.error(`[Tidal] (${url}) ${error}`);
    return null;
  }
}

export async function getOrUpdateTidalAccessToken() {
  const cache = await getCachedTidalAccessToken();

  if (cache) {
    return cache;
  }

  const data = new URLSearchParams({
    grant_type: 'client_credentials',
  });

  const response = await HttpClient.post<TidalAuthResponse>(
    ENV.adapters.tidal.authUrl,
    data,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            ENV.adapters.tidal.clientId + ':' + ENV.adapters.tidal.clientSecret
          ).toString('base64'),
      },
    }
  );

  await cacheTidalAccessToken(response.access_token, response.expires_in);

  return response.access_token;
}
