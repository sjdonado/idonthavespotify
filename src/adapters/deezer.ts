import { ADAPTERS_QUERY_LIMIT } from '~/config/constants';
import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';
import { findBestMatch, type MatchCandidate } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

interface DeezerSearchResponse {
  total: number;
  data: Array<{
    title?: string;
    name?: string;
    link: string;
    artist?: { name: string };
  }>;
}

const DEEZER_SEARCH_TYPES = {
  [MetadataType.Song]: 'track',
  [MetadataType.Album]: 'album',
  [MetadataType.Playlist]: 'playlist',
  [MetadataType.Artist]: 'artist',
  [MetadataType.Show]: 'podcast',
  [MetadataType.Podcast]: undefined,
};

export async function getDeezerLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
  const searchType = DEEZER_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const params = new URLSearchParams({
    q: query,
    limit: String(ADAPTERS_QUERY_LIMIT),
  });

  const url = new URL(`${ENV.adapters.deezer.apiUrl}/${searchType}`);
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(Adapter.Deezer, sourceParser, sourceId);
  if (cache) {
    logger.info(`[Deezer] (${url}) cache hit`);
    return cache;
  }

  try {
    const response = await HttpClient.get<DeezerSearchResponse>(url.toString());

    if (response.total === 0) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    const candidates: MatchCandidate[] = response.data.map(item => ({
      title: item.title || item.name || '',
      artist: item.artist?.name,
      url: item.link,
    }));

    const { bestMatch, highestScore } = findBestMatch(candidates, query, Adapter.Deezer);

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    logger.info(
      `[Deezer] Best match score: ${highestScore.toFixed(3)} (verified: ${bestMatch.isVerified ? 'yes' : 'no'}, available: ${!bestMatch.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(Adapter.Deezer, sourceParser, sourceId, bestMatch);

    return bestMatch;
  } catch (error) {
    logger.error(`[Deezer] (${url}) ${error}`);
    return null;
  }
}
