import {
  type SpotifyContentLink,
  SpotifyContentLinkType,
  SpotifyMetadataType,
} from '~/@types/global';

import * as ENV from '~/config/env/server';

import { SpotifyMetadata } from '~/server/services/spotify';

import { getQueryFromMetadata } from '~/utils/query';
import { compareResponseWithQuery } from '~/utils/compare';

const {
  apiSearchUrl,
  apiKey,
  baseUrl,
} = ENV.services.youtube;

interface YoutubeSearchListResponse {
  error?: { message: string };
  items?: [{
    id: {
      videoId: string,
      channelId: string,
      playlistId: string,
    },
    snippet: {
      title: string,
    },
  }];
}

export const getYoutubeLink = async (metadata: SpotifyMetadata): Promise<SpotifyContentLink | undefined> => {
  let query = getQueryFromMetadata(metadata);

  const searchTypes = {
    [SpotifyMetadataType.Song]: 'video',
    [SpotifyMetadataType.Album]: 'playlist',
    [SpotifyMetadataType.Playlist]: 'playlist',
    [SpotifyMetadataType.Artist]: 'channel',
    [SpotifyMetadataType.Podcast]: 'video',
    [SpotifyMetadataType.Show]: 'channel',
  };

  if (metadata.type === SpotifyMetadataType.Artist) {
    query = `${query} official`;
  }

  const url = `${apiSearchUrl}?part=snippet&&type=${searchTypes[metadata.type]}&q=${query}&maxResults=1&key=${apiKey}`;

  const response = (await fetch(url).then((res) => res.json()) as YoutubeSearchListResponse);

  if (response.error) {
    console.error('[Youtube]', response.error.message);
    return undefined;
  }

  if (!response.items?.length) {
    console.error('[Youtube] No results found', url);
    return undefined;
  }

  const [{ id: { videoId, channelId, playlistId }, snippet }] = response.items;

  const youtubeLinkByType = {
    [SpotifyMetadataType.Song]: `${baseUrl}/watch?v=${videoId}`,
    [SpotifyMetadataType.Album]: `${baseUrl}/playlist?list=${playlistId}`,
    [SpotifyMetadataType.Playlist]: `${baseUrl}/playlist?list=${playlistId}`,
    [SpotifyMetadataType.Artist]: `${baseUrl}/channel/${channelId}`,
    [SpotifyMetadataType.Podcast]: `${baseUrl}/watch?v=${videoId}`,
    [SpotifyMetadataType.Show]: `${baseUrl}/channel/${channelId}`,
  };

  if (compareResponseWithQuery(snippet.title, query)) {
    return undefined;
  }

  return {
    type: SpotifyContentLinkType.Youtube,
    url: youtubeLinkByType[metadata.type],
    isVerified: true,
  };
};
