import { ADAPTERS_QUERY_LIMIT } from '~/config/constants';
import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import { findBestMatch, type MatchCandidate } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getServiceGuard } from '~/utils/service-guard';

type ItunesSearchItem = {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  feedUrl?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
};

type ItunesSearchResponse = {
  resultCount?: number;
  results?: ItunesSearchItem[];
};

const APPLE_PODCASTS_SEARCH_ENTITIES = {
  [MetadataType.Podcast]: 'podcastEpisode',
  [MetadataType.Show]: 'podcast',
} as const;

async function searchItunes(
  query: string,
  entity: string
): Promise<ItunesSearchItem[]> {
  const params = new URLSearchParams({
    term: query,
    media: 'podcast',
    entity,
    limit: String(ADAPTERS_QUERY_LIMIT),
    country: 'US',
  });
  const url = `${ENV.adapters.applePodcasts.apiUrl}/search?${params}`;

  logger.info(`[ApplePodcasts] Searching: ${url}`);

  const response = await HttpClient.get<ItunesSearchResponse | string>(url);
  const data = typeof response === 'string' ? JSON.parse(response) : response;
  return data.results ?? [];
}

const titleOf = (item: ItunesSearchItem, type: MetadataType): string => {
  if (type === MetadataType.Podcast) {
    return `${item.trackName ?? ''} ${item.collectionName ?? ''}`.trim();
  }
  return item.collectionName ?? item.trackName ?? '';
};

const matchCandidates = (
  items: ItunesSearchItem[],
  urlOf: (item: ItunesSearchItem) => string | undefined,
  titleOfItem: (item: ItunesSearchItem) => string,
  artistOfItem: (item: ItunesSearchItem) => string,
  query: string,
  adapter: Adapter
) => {
  const candidates: MatchCandidate[] = items
    .filter(item => urlOf(item))
    .map(item => ({
      title: titleOfItem(item),
      artist: artistOfItem(item),
      url: urlOf(item) as string,
    }));

  return findBestMatch(candidates, query, adapter);
};

const recordMatch = async (
  match: SearchResultLink,
  highestScore: number,
  adapter: Adapter,
  sourceParser: Parser,
  sourceId: string
) => {
  logger.info(
    `[ApplePodcasts] Best match score: ${highestScore.toFixed(3)} (verified: ${match.isVerified ? 'yes' : 'no'}, available: ${!match.notAvailable ? 'yes' : 'no'})`
  );

  await cacheSearchResultLink(adapter, sourceParser, sourceId, match);

  return match;
};

const pageUrlOf = (item: ItunesSearchItem): string | undefined =>
  item.trackViewUrl ?? item.collectionViewUrl;

const artistOf = (item: ItunesSearchItem): string =>
  item.artistName ?? item.collectionName ?? '';

export async function getApplePodcastsLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
  const entity =
    APPLE_PODCASTS_SEARCH_ENTITIES[
      metadata.type as keyof typeof APPLE_PODCASTS_SEARCH_ENTITIES
    ];
  if (!entity) return null;

  const cache = await getCachedSearchResultLink(
    Adapter.ApplePodcasts,
    sourceParser,
    sourceId
  );
  if (cache) {
    logger.info(`[ApplePodcasts] (${query}) cache hit`);
    return cache;
  }

  const guard = getServiceGuard('applePodcasts');
  if (!guard.acquire()) {
    logger.warn('[ApplePodcasts] service guard: request blocked');
    return null;
  }

  try {
    const items = await searchItunes(query, entity);
    guard.recordSuccess();

    const { bestMatch, highestScore } = matchCandidates(
      items,
      pageUrlOf,
      item => titleOf(item, metadata.type),
      artistOf,
      query,
      Adapter.ApplePodcasts
    );

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    const match = bestMatch as SearchResultLink;

    return recordMatch(
      match,
      highestScore,
      Adapter.ApplePodcasts,
      sourceParser,
      sourceId
    );
  } catch (error) {
    guard.recordFailure();
    logger.error(`[ApplePodcasts] (${query}) ${error}`);
    return null;
  }
}

export async function getPodcastFeedLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
  // Feeds only exist for podcasts and shows; every other type skips
  // before touching the network.
  if (
    metadata.type !== MetadataType.Podcast &&
    metadata.type !== MetadataType.Show
  ) {
    return null;
  }
  const entity =
    APPLE_PODCASTS_SEARCH_ENTITIES[
      metadata.type as keyof typeof APPLE_PODCASTS_SEARCH_ENTITIES
    ];

  const cache = await getCachedSearchResultLink(
    Adapter.PodcastFeed,
    sourceParser,
    sourceId
  );
  if (cache) {
    logger.info(`[PodcastFeed] (${query}) cache hit`);
    return cache;
  }

  const guard = getServiceGuard('applePodcasts');
  if (!guard.acquire()) {
    logger.warn('[PodcastFeed] service guard: request blocked');
    return null;
  }

  try {
    const items = await searchItunes(query, entity);
    guard.recordSuccess();

    const { bestMatch, highestScore } = matchCandidates(
      items,
      item => item.feedUrl,
      item => titleOf(item, metadata.type),
      artistOf,
      query,
      Adapter.PodcastFeed
    );

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    const match = bestMatch as SearchResultLink;

    return recordMatch(
      match,
      highestScore,
      Adapter.PodcastFeed,
      sourceParser,
      sourceId
    );
  } catch (error) {
    guard.recordFailure();
    logger.error(`[PodcastFeed] (${query}) ${error}`);
    return null;
  }
}
