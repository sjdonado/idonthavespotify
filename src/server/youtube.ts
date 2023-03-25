import { SpotifyMetadata } from '~/server/spotify';
import { getQueryFromMetadata } from '~/utils/query';

const {
  VITE_YOUTUBE_API_KEY,
  VITE_YOUTUBE_API_SEARCH_URL,
  VITE_YOUTUBE_BASE_URL,
} = import.meta.env;

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
  const url = `${VITE_YOUTUBE_API_SEARCH_URL}?q=${query}&maxResults=1&key=${VITE_YOUTUBE_API_KEY}`;

  const response = await fetch(url).then((res) => res.json()) as YoutubeSearchListResponse;

  if (response.error) {
    throw new Error(response.error.message);
  }

  const { videoId, channelId, playlistId } = response.items[0].id;

  if (channelId) {
    return `${VITE_YOUTUBE_BASE_URL}/channel/${channelId}`;
  }

  if (playlistId) {
    return `${VITE_YOUTUBE_BASE_URL}/playlist?list=${playlistId}`;
  }

  return `${VITE_YOUTUBE_BASE_URL}/watch?v=${videoId}`;
};
