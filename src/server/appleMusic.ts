import { SpotifyMetadata } from '~/server/spotify';
import { getQueryFromMetadata } from '~/utils/query';

const { VITE_APPLE_MUSIC_BASE_URL } = import.meta.env;

export const getAppleMusicLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${VITE_APPLE_MUSIC_BASE_URL}${query}`;

  return url;
};
