import { SpotifyMetadata } from '~/server/spotify';
import { getQueryFromMetadata } from '~/utils/query';

const APPLE_MUSIC_BASE_URL = 'https://music.apple.com/search?term=';

export const getAppleMusicLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${APPLE_MUSIC_BASE_URL}${query}`;

  return url;
};
