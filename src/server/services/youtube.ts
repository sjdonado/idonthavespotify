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
  items: [{
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
  const query = getQueryFromMetadata(metadata);

  const searchTypes = {
    [SpotifyMetadataType.Song]: 'video',
    [SpotifyMetadataType.Album]: 'playlist',
    [SpotifyMetadataType.Playlist]: 'playlist',
    [SpotifyMetadataType.Artist]: 'channel',
    [SpotifyMetadataType.Podcast]: 'video',
    [SpotifyMetadataType.Show]: 'channel',
  };

  const url = `${apiSearchUrl}?part=snippet&type=${searchTypes[metadata.type]}&q=${query}&maxResults=1&key=${apiKey}`;

  const response = (await fetch(url).then((res) => res.json()) as YoutubeSearchListResponse);

  if (response.error) {
    console.error('[Youtube]', response.error.message);
    return undefined;
  }

  const [{ id: { videoId, channelId, playlistId }, snippet }] = response.items;

  let youtubeLink = '';

  if (videoId) {
    youtubeLink = `${baseUrl}/watch?v=${videoId}`;
  }

  if (channelId) {
    youtubeLink = `${baseUrl}/channel/${channelId}`;
  }

  if (playlistId) {
    youtubeLink = `${baseUrl}/playlist?list=${playlistId}`;
  }

  if (compareResponseWithQuery(snippet.title, query)) {
    return undefined;
  }

  return {
    type: SpotifyContentLinkType.Youtube,
    url: youtubeLink,
    isVerified: true,
  };
};
