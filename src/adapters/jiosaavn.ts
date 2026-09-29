import { ADAPTERS_QUERY_LIMIT } from '~/config/constants';
import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import { findBestMatch, type MatchCandidate } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getServiceGuard } from '~/utils/service-guard';

type JiosaavnSearchItem = {
  song?: string;
  title?: string;
  name?: string;
  listname?: string;
  primary_artists?: string;
  music?: string;
  perma_url?: string;
};

type JiosaavnSearchResponse = {
  results?: JiosaavnSearchItem[];
};

const JIOSAAVN_SEARCH_CALLS = {
  [MetadataType.Song]: 'search.getResults',
  [MetadataType.Album]: 'search.getAlbumResults',
  [MetadataType.Playlist]: 'search.getPlaylistResults',
  [MetadataType.Artist]: 'search.getArtistResults',
  [MetadataType.Show]: undefined,
  [MetadataType.Podcast]: undefined,
};

const titleOf = (item: JiosaavnSearchItem): string =>
  item.song ?? item.title ?? item.name ?? item.listname ?? '';

const artistOf = (item: JiosaavnSearchItem): string =>
  item.primary_artists ?? item.music ?? '';

export async function getJiosaavnLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
  const call = JIOSAAVN_SEARCH_CALLS[metadata.type];
  if (!call) return null;

  const params = new URLSearchParams({
    __call: call,
    q: query,
    p: '1',
    n: String(ADAPTERS_QUERY_LIMIT),
    cc: 'in',
    _marker: '0',
    _format: 'json',
  });
  const url = `${ENV.adapters.jiosaavn.apiUrl}/api.php?${params}`;

  const cache = await getCachedSearchResultLink(
    Adapter.Jiosaavn,
    sourceParser,
    sourceId
  );
  if (cache) {
    logger.info(`[Jiosaavn] (${url}) cache hit`);
    return cache;
  }

  const guard = getServiceGuard('jiosaavn');
  if (!guard.acquire()) {
    logger.warn('[Jiosaavn] service guard: request blocked');
    return null;
  }

  try {
    // Search endpoints serve JSON as text/html, so HttpClient hands back
    // a string instead of a parsed body.
    const raw = await HttpClient.get<JiosaavnSearchResponse | string>(
      url.toString()
    );
    const response =
      typeof raw === 'string'
        ? (JSON.parse(raw) as JiosaavnSearchResponse)
        : raw;
    guard.recordSuccess();

    const candidates: MatchCandidate[] = (response.results ?? [])
      .filter(item => item.perma_url)
      .map(item => ({
        title: titleOf(item),
        artist: artistOf(item),
        url: item.perma_url as string,
      }));

    const { bestMatch, highestScore } = findBestMatch(
      candidates,
      query,
      Adapter.Jiosaavn
    );

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    const match = bestMatch as SearchResultLink;

    logger.info(
      `[Jiosaavn] Best match score: ${highestScore.toFixed(3)} (verified: ${match.isVerified ? 'yes' : 'no'}, available: ${!match.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(Adapter.Jiosaavn, sourceParser, sourceId, match);

    return match;
  } catch (error) {
    guard.recordFailure();
    logger.error(`[Jiosaavn] (${url}) ${error}`);
    return null;
  }
}
