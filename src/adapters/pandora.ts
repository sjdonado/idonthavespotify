import { ADAPTERS_QUERY_LIMIT } from '~/config/constants';
import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';
import { findBestMatch, type MatchCandidate } from '~/utils/compare';
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

interface PandoraAnnotationItem {
  name?: string;
  type?: string;
  artistName?: string;
  programName?: string;
  shareableUrlPath?: string;
  // These results would be needlessly verbose to model, and the fields vary a lot by type...
  [key: string]: unknown;
}

interface PandoraSearchResponse {
  searchToken: string;
  annotations: Record<string, PandoraAnnotationItem>;
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
  annotationRecipe: 'CLASS_OF_2019'; // Adorable
}

export async function getPandoraLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
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
    annotationRecipe: 'CLASS_OF_2019',
  };

  // We're going to POST to the API, so our URL doesn't contain any query-specific information
  // Here we'll just construct a fake one for caching purposes
  const cacheurl = new URL('https://pandora.com/');
  cacheurl.search = new URLSearchParams({ q: query, t: searchType }).toString();

  const cache = await getCachedSearchResultLink(Adapter.Pandora, sourceParser, sourceId);
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

    const candidates: MatchCandidate[] = [];

    for (const key of response.results) {
      if (!(key in response.annotations)) continue;

      const item = response.annotations[key];
      let artist: string | undefined;

      if ((item.type === 'AL' || item.type === 'TR') && 'artistName' in item) {
        artist = item.artistName as string;
      }
      if (item.type === 'PE' && 'programName' in item) {
        artist = item.programName as string;
      }

      candidates.push({
        title: item.name || '',
        artist,
        url: `https://www.pandora.com${item.shareableUrlPath}`,
      });
    }

    const { bestMatch, highestScore } = findBestMatch(candidates, query, Adapter.Pandora);

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    logger.info(
      `[Pandora] Best match score: ${highestScore.toFixed(3)} (verified: ${bestMatch.isVerified ? 'yes' : 'no'}, available: ${!bestMatch.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(Adapter.Pandora, sourceParser, sourceId, bestMatch);

    return bestMatch;
  } catch (error) {
    logger.error(`[Pandora] (${url}) ${error}`);
    return null;
  }
}
