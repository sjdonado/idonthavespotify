import * as config from '~/config/default';
import { ADAPTERS_QUERY_LIMIT } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { responseMatchesQuery } from '~/utils/compare';

import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

type YoutubeSearchListResponse = {
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
};

const YOUTUBE_SEARCH_TYPES = {
  [SpotifyMetadataType.Song]: 'video',
  [SpotifyMetadataType.Album]: 'playlist',
  [SpotifyMetadataType.Playlist]: 'playlist',
  [SpotifyMetadataType.Artist]: 'channel',
  [SpotifyMetadataType.Podcast]: 'video',
  [SpotifyMetadataType.Show]: 'channel',
};

export async function getYouTubeLink(query: string, metadata: SpotifyMetadata) {
  const params = new URLSearchParams({
    part: 'snippet',
    maxResults: String(ADAPTERS_QUERY_LIMIT),
    q: metadata.type === SpotifyMetadataType.Artist ? `${query} official` : query,
    type: YOUTUBE_SEARCH_TYPES[metadata.type],
    key: config.services.youTube.apiKey as string,
  });

  const url = new URL(`${config.services.youTube.apiUrl}/search`);
  url.search = params.toString();

  try {
    const response = await HttpClient.get<YoutubeSearchListResponse>(url.toString());

    if (!response.items?.length) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
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
      throw new Error(`Query does not match: ${JSON.stringify(snippet)}`);
    }

    return {
      type: SpotifyContentLinkType.YouTube,
      url: youtubeLinkByType[metadata.type],
      isVerified: true,
    } as SpotifyContentLink;
  } catch (error) {
    logger.error(`[YouTube] (${url}) ${error}`);
  }
}
