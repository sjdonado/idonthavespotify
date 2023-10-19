import * as config from '~/config/default';

import { setWithKey, getByKey } from '~/utils/redis';
import { SpotifyContent } from './search';

export const getSpotifySearchFromCache = async (id: string) => {
  if (id.length === 0) {
    return undefined;
  }

  const cache = await getByKey(`${config.redis.cacheKey}:${id}`);

  if (!cache) {
    return undefined;
  }

  return JSON.parse(cache) as SpotifyContent;
};

export const cacheSpotifySearch = async (spotifyContent: SpotifyContent) => {
  return setWithKey(
    `${config.redis.cacheKey}:${spotifyContent.id}`,
    JSON.stringify(spotifyContent),
    true
  );
};
