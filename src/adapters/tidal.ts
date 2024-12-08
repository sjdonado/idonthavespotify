import { compareTwoStrings } from 'string-similarity';

import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';
import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import {
  cacheSearchResultLink,
  cacheTidalAccessToken,
  getCachedSearchResultLink,
  getCachedTidalAccessToken,
} from '~/services/cache';
import { SearchMetadata, SearchResultLink } from '~/services/search';
import { getOrUpdateAccessToken } from '~/utils/access-token';
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
  included: Array<{
    attributes: {
      title: string;
    };
  }>;
}

export const TIDAL_SEARCH_TYPES = {
  [MetadataType.Song]: 'tracks',
  [MetadataType.Album]: 'albums',
  [MetadataType.Playlist]: 'playlists',
  [MetadataType.Artist]: 'artists',
  [MetadataType.Show]: null,
  [MetadataType.Podcast]: null,
};

export async function getTidalLink(query: string, metadata: SearchMetadata) {
  const searchType = TIDAL_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const params = new URLSearchParams({
    countryCode: 'US',
    include: searchType,
  });

  const url = new URL(
    `${ENV.adapters.tidal.apiUrl}/${encodeURIComponent(query)}/relationships/${searchType}`
  );
  url.search = params.toString();

  console.log('tidal', url.toString(), await getOrUpdateTidalAccessToken());
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

    const { data, included } = response;
    if (!data || data.length === 0) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    let bestMatch: SearchResultLink | null = null;
    let highestScore = 0;

    for (const item of included) {
      const title = item.attributes.title;
      const score = compareTwoStrings(title.toLowerCase(), query.toLowerCase());

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          type: Adapter.Tidal,
          url: `${ENV.adapters.tidal.baseUrl}/${searchType.slice(0, -1)}/${data[0].id}`,
          isVerified: score > RESPONSE_COMPARE_MIN_SCORE,
        };
      }
    }

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    await cacheSearchResultLink(url, bestMatch);

    return bestMatch;
  } catch (error) {
    logger.error(`[Tidal] (${url}) ${error}`);
    return null;
  }
}

export async function getOrUpdateTidalAccessToken() {
  return getOrUpdateAccessToken(
    getCachedTidalAccessToken,
    async () => {
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

      return {
        accessToken: response.access_token,
        expiresIn: response.expires_in,
      };
    },
    cacheTidalAccessToken
  );
}
