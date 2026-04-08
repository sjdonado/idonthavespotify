import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import {
  cacheSearchResultLink,
  cacheTidalAccessToken,
  getCachedSearchResultLink,
  getCachedTidalAccessToken,
} from '~/services/cache';
import type { SearchMetadata } from '~/services/search';
import { getOrUpdateAccessToken } from '~/utils/access-token';
import { findBestMatch, type MatchCandidate } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getServiceGuard } from '~/utils/service-guard';

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
      title?: string;
      name?: string;
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

export async function getTidalLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
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

  const cache = await getCachedSearchResultLink(Adapter.Tidal, sourceParser, sourceId);
  if (cache) {
    logger.info(`[Tidal] (${url}) cache hit`);
    return cache;
  }

  const guard = getServiceGuard('tidal');
  if (!guard.acquire()) {
    logger.warn('[Tidal] service guard: request blocked');
    return null;
  }

  try {
    const response = await HttpClient.get<TidalSearchResponse>(url.toString(), {
      headers: {
        Authorization: `Bearer ${await getOrUpdateTidalAccessToken()}`,
      },
    });
    guard.recordSuccess();

    const { data, included } = response;
    if (!data || data.length === 0) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    const candidates: MatchCandidate[] = included.map((item, i) => ({
      title: item.attributes.title ?? item.attributes.name ?? '',
      url: `${ENV.adapters.tidal.baseUrl}/${searchType.slice(0, -1)}/${data[i]?.id ?? data[0].id}`,
    }));

    const { bestMatch, highestScore } = findBestMatch(candidates, query, Adapter.Tidal);

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    logger.info(
      `[Tidal] Best match score: ${highestScore.toFixed(3)} (verified: ${bestMatch.isVerified ? 'yes' : 'no'}, available: ${!bestMatch.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(Adapter.Tidal, sourceParser, sourceId, bestMatch);

    return bestMatch;
  } catch (error) {
    guard.recordFailure();
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
