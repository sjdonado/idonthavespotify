import { SpotifyMetadata } from '~/server/spotify';
import { getQueryFromMetadata } from '~/utils/query';

const { VITE_SOUNDCLOUD_BASE_URL } = import.meta.env;

export const getSoundcloudLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${VITE_SOUNDCLOUD_BASE_URL}${query}`;

  return url;
};
