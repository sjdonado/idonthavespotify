import { SpotifyMetadata } from '~/server/spotify';
import { getQueryFromMetadata } from '~/utils/query';

const SOUNDCLOUD_BASE_URL = 'https://soundcloud.com/search/sounds?q=';

export const getSoundcloudLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${SOUNDCLOUD_BASE_URL}${query}`;

  return url;
};
