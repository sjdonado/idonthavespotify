import { compareTwoStrings } from 'string-similarity';

import {
  ADAPTERS_QUERY_LIMIT,
  RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
  RESPONSE_COMPARE_MIN_SCORE,
} from '~/config/constants';
import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

const PANDORA_SEARCH_TYPES = {
  [MetadataType.Song]: 'TR',
  [MetadataType.Album]: 'AL',
  [MetadataType.Playlist]: 'PL',
  [MetadataType.Artist]: 'AR',
  [MetadataType.Show]: 'PC',
  [MetadataType.Podcast]: 'PE',
};

interface PandoraSearchResponse {
  searchToken: string;
  // These results would be needlessly verbose to model, and the fields vary a lot by type...
  annotations: Record<string, any>;
  results: string[];
}

interface PandoraSearchRequest {
  query: string;
  types: string[];
  listener: null;
  start: number;
  count: number;
  annotate: true;
  searchTime: number;
  annotationRecipe: "CLASS_OF_2019"; // Adorable
}

export async function getPandoraLink(query: string, metadata: SearchMetadata) {
  const searchType = PANDORA_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const params: PandoraSearchRequest = {
    query,
    types: [searchType],
    listener: null,
    start: 0,
    count: Number(ADAPTERS_QUERY_LIMIT),
    annotate: true,
    searchTime: 0,
    annotationRecipe: "CLASS_OF_2019",
  };

  // We're going to POST to the API, so our URL doesn't contain any query-specific information
  // Here we'll just construct a fake one for caching purposes
  const cacheurl = new URL('https://pandora.com/');
  cacheurl.search = new URLSearchParams({q: query,t: searchType}).toString();

  const cache = await getCachedSearchResultLink(cacheurl);
  if (cache) {
    logger.info(`[Pandora] (${cacheurl}) cache hit`);
    return cache;
  }

  const url = new URL(ENV.adapters.pandora.apiUrl);
  const body = JSON.stringify(params);

  try {
    const response = await HttpClient.post<PandoraSearchResponse>(url.toString(), body, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.results.length === 0) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    let bestMatch: SearchResultLink | null = null;
    let highestScore = 0;

    for (const key of response.results) {
      if (!(key in response.annotations)) continue;

      const item = response.annotations[key];

      // Debug
      // logger.info(JSON.stringify(item, null, 2));

      let title = item.name || '';
      if ((item.type === 'AL' || item.type === 'TR') && 'artistName' in item) {
        title += ` ${item.artistName}`;
      }
      if (item.type === 'PE' && 'programName' in item) {
        title += ` ${item.programName}`;
      }

      const score = compareTwoStrings(title.toLowerCase(), query.toLowerCase());

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          type: Adapter.Pandora,
          url: `https://www.pandora.com${item.shareableUrlPath}`,
          isVerified: score >= RESPONSE_COMPARE_MIN_SCORE,
          notAvailable: score < RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
        };
      }
    }

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    logger.info(
      `[Pandora] Best match score: ${highestScore.toFixed(3)} (verified: ${bestMatch.isVerified ? 'yes' : 'no'}, available: ${!bestMatch.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(cacheurl, bestMatch);

    return bestMatch;
  } catch (error) {
    logger.error(`[Pandora] (${url}) ${error}`);
    return null;
  }
}
