import { SpotifyMetadata } from '~/server/spotify';
import { getQueryFromMetadata } from '~/utils/query';

const { VITE_TIDAL_BASE_URL } = import.meta.env;

export const getTidalLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${VITE_TIDAL_BASE_URL}${query}`;

  return url;
};
