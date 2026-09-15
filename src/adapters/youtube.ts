import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';
import { findBestMatch, type MatchCandidate } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getServiceGuard } from '~/utils/service-guard';

interface YoutubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: Array<{
    kind: string;
    etag: string;
    id: {
      kind: string;
      videoId?: string;
      playlistId?: string;
      channelId?: string;
    };
    snippet?: {
      title?: string;
      channelTitle?: string;
    };
  }>;
}

export const YOUTUBE_SEARCH_TYPES = {
  [MetadataType.Song]: 'video',
  [MetadataType.Album]: 'playlist',
  [MetadataType.Playlist]: 'playlist',
  [MetadataType.Artist]: 'channel',
  [MetadataType.Podcast]: 'video',
  [MetadataType.Show]: undefined,
};

export async function getYouTubeLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
  const searchType = YOUTUBE_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const params = new URLSearchParams({
    type: searchType,
    regionCode: 'US',
    q: query,
    part: 'id,snippet',
    safeSearch: 'none',
    key: ENV.adapters.youTube.apiKey,
  });

  const url = new URL(`${ENV.adapters.youTube.apiUrl}/search`);
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(Adapter.YouTube, sourceParser, sourceId);
  if (cache) {
    logger.info(`[YouTube] (${url}) cache hit`);
    return cache;
  }

  const guard = getServiceGuard('youTube');
  if (!guard.acquire()) {
    logger.warn('[YouTube] service guard: request blocked');
    return null;
  }

  try {
    const response = await HttpClient.get<YoutubeSearchResponse>(url.toString());
    guard.recordSuccess();

    const { items } = response;
    if (!items || !items[0]) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    const candidates: MatchCandidate[] = [];
    for (const item of items) {
      const ids = item.id;
      let path: string | undefined;
      switch (metadata.type) {
        case MetadataType.Song:
          path = ids.videoId ? `watch?v=${ids.videoId}` : undefined;
          break;
        case MetadataType.Album:
        case MetadataType.Playlist:
          path = ids.playlistId ? `playlist?list=${ids.playlistId}` : undefined;
          break;
        case MetadataType.Artist:
          path = ids.channelId ? `channel/${ids.channelId}` : undefined;
          break;
        case MetadataType.Podcast:
          path = ids.videoId ? `podcast/${ids.videoId}` : undefined;
          break;
        default:
          path = undefined;
      }
      if (!path) continue;
      candidates.push({
        title: item.snippet?.title ?? '',
        artist: item.snippet?.channelTitle,
        url: `${ENV.adapters.youTube.musicBaseUrl}/${path}`,
      });
    }

    const { bestMatch, highestScore } = findBestMatch(candidates, query, Adapter.YouTube);

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    logger.info(
      `[YouTube] Best match score: ${highestScore.toFixed(3)} (verified: ${bestMatch.isVerified ? 'yes' : 'no'}, available: ${!bestMatch.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(
      Adapter.YouTube,
      sourceParser,
      sourceId,
      bestMatch
    );

    return bestMatch;
  } catch (error) {
    guard.recordFailure();
    logger.error(`[YouTube] (${url}) ${error}`);
    return null;
  }
}
