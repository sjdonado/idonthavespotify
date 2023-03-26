import { SpotifyMetadata } from '~/server/services/spotify';
import { getQueryFromMetadata } from '~/utils/query';

import * as ENV from '~/config/env/server';

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
    }
  }];
}

export const getYoutubeLink = async (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${apiSearchUrl}?q=${query}&maxResults=1&key=${apiKey}`;

  const response = await fetch(url).then((res) => res.json()) as YoutubeSearchListResponse;

  if (response.error) {
    throw new Error(response.error.message);
  }

  const { videoId, channelId, playlistId } = response.items[0].id;

  if (channelId) {
    return `${baseUrl}/channel/${channelId}`;
  }

  if (playlistId) {
    return `${baseUrl}/playlist?list=${playlistId}`;
  }

  return `${baseUrl}/watch?v=${videoId}`;
};
