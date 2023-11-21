import * as config from '~/config/default';

import type HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { responseMatchesQuery } from '~/utils/compare';
import { getQueryFromMetadata } from '~/utils/query';

import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

interface YoutubeSearchListResponse {
  items: [
    {
      id: {
        videoId: string;
        channelId: string;
        playlistId: string;
      };
      snippet: {
        title: string;
      };
    },
  ];
}

export async function getYouTubeLink(
  httpClient: HttpClient,
  metadata: SpotifyMetadata
): Promise<SpotifyContentLink | undefined> {
  let query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);

  const searchTypes = {
    [SpotifyMetadataType.Song]: 'video',
    [SpotifyMetadataType.Album]: 'playlist',
    [SpotifyMetadataType.Playlist]: 'playlist',
    [SpotifyMetadataType.Artist]: 'channel',
    [SpotifyMetadataType.Podcast]: 'video',
    [SpotifyMetadataType.Show]: 'channel',
  };

  if (metadata.type === SpotifyMetadataType.Artist) {
    query = `${query}%20official`;
  }

  const url = `${config.services.youTube.apiSearchUrl}${query}&type=${
    searchTypes[metadata.type]
  }&key=${config.services.youTube.apiKey}`;

  try {
    const response = (await httpClient.get(url)) as YoutubeSearchListResponse;

    if (!response.items?.length) {
      logger.error('[YouTube] No results found', url);
      return undefined;
    }

    const [
      {
        id: { videoId, channelId, playlistId },
        snippet,
      },
    ] = response.items;

    const youtubeLinkByType = {
      [SpotifyMetadataType.Song]: `${config.services.youTube.baseUrl}watch?v=${videoId}`,
      [SpotifyMetadataType.Album]: `${config.services.youTube.baseUrl}playlist?list=${playlistId}`,
      [SpotifyMetadataType.Playlist]: `${config.services.youTube.baseUrl}playlist?list=${playlistId}`,
      [SpotifyMetadataType.Artist]: `${config.services.youTube.baseUrl}channel/${channelId}`,
      [SpotifyMetadataType.Podcast]: `${config.services.youTube.baseUrl}watch?v=${videoId}`,
      [SpotifyMetadataType.Show]: `${config.services.youTube.baseUrl}channel/${channelId}`,
    };

    if (!responseMatchesQuery(snippet.title, query)) {
      return undefined;
    }

    return {
      type: SpotifyContentLinkType.YouTube,
      url: youtubeLinkByType[metadata.type],
      isVerified: true,
    };
  } catch (error) {
    logger.error(`[YouTube] (${query}) ${error}`);
    return undefined;
  }
}
