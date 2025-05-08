import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

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

const YOUTUBE_SEARCH_LINK_TYPE = (item: YoutubeSearchResponse['items'][number]) => ({
  [MetadataType.Song]: `watch?v=${item.id.videoId}`,
  [MetadataType.Album]: `playlist?list=${item.id.playlistId}`,
  [MetadataType.Playlist]: `playlist?list=${item.id.playlistId}`,
  [MetadataType.Artist]: `channel/${item.id.channelId}`,
  [MetadataType.Podcast]: `podcast/${item.id.videoId}`,
  [MetadataType.Show]: undefined,
});

export async function getYouTubeLink(query: string, metadata: SearchMetadata) {
  const searchType = YOUTUBE_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const params = new URLSearchParams({
    type: searchType,
    regionCode: 'US',
    q: query,
    part: 'id',
    safeSearch: 'none',
    key: ENV.adapters.youTube.apiKey,
  });

  const url = new URL(`${ENV.adapters.youTube.apiUrl}/search`);
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(url);
  if (cache) {
    logger.info(`[YouTube] (${url}) cache hit`);
    return cache;
  }

  try {
    const response = await HttpClient.get<YoutubeSearchResponse>(url.toString());

    const { items } = response;
    if (!items || !items[0]) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    const link = `${ENV.adapters.youTube.musicBaseUrl}/${YOUTUBE_SEARCH_LINK_TYPE(items[0])[metadata.type]}`;

    const searchResultLink = {
      type: Adapter.YouTube,
      url: link,
      isVerified: false,
    } as SearchResultLink;

    await cacheSearchResultLink(url, searchResultLink);

    return searchResultLink;
  } catch (error) {
    logger.error(`[YouTube] (${url}) ${error}`);
    return null;
  }
}
