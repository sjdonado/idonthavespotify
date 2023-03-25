import { SpotifyMetadata } from '~/server/spotify';
import { getQueryFromMetadata } from '~/utils/query';

const TIDAL_BASE_URL = 'https://listen.tidal.com/search?q=';

export const getTidalLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${TIDAL_BASE_URL}${query}`;

  return url;
};
