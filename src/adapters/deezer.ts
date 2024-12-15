import { compareTwoStrings } from 'string-similarity';

import { ADAPTERS_QUERY_LIMIT, RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';
import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import { SearchMetadata, SearchResultLink } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

interface DeezerSearchResponse {
  total: number;
  data: [
    {
      title?: string;
      name?: string;
      link: string;
    },
  ];
}

const DEEZER_SEARCH_TYPES = {
  [MetadataType.Song]: 'track',
  [MetadataType.Album]: 'album',
  [MetadataType.Playlist]: 'playlist',
  [MetadataType.Artist]: 'artist',
  [MetadataType.Show]: 'podcast',
  [MetadataType.Podcast]: undefined,
};

export async function getDeezerLink(query: string, metadata: SearchMetadata) {
  const searchType = DEEZER_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const params = new URLSearchParams({
    q: query,
    limit: String(ADAPTERS_QUERY_LIMIT),
  });

  const url = new URL(`${ENV.adapters.deezer.apiUrl}/${searchType}`);
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(url);
  if (cache) {
    logger.info(`[Deezer] (${url}) cache hit`);
    return cache;
  }

  try {
    const response = await HttpClient.get<DeezerSearchResponse>(url.toString());

    if (response.total === 0) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    let bestMatch: SearchResultLink | null = null;
    let highestScore = 0;

    for (const item of response.data) {
      const title = item.title || item.name || '';
      const score = compareTwoStrings(title.toLowerCase(), query.toLowerCase());

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          type: Adapter.Deezer,
          url: item.link,
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
    logger.error(`[Deezer] (${url}) ${error}`);
    return null;
  }
}
