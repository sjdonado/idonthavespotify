import * as config from '~/config/default';

import { setWithKey, getByKey } from '~/utils/redis';
import { SpotifyContent } from './search';
import { TidalAuthResponse } from '~/adapters/tidal';

export const cacheSpotifySearch = async (spotifyContent: SpotifyContent) => {
  return setWithKey(
    `${config.redis.cacheKey}:${spotifyContent.id}`,
    JSON.stringify(spotifyContent)
  );
};

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

// export const cacheSpotifyAccessToken = async (
//   accessToken: string,
//   expiration: number
// ) => {
//   return setWithKey(
//     `${config.redis.cacheKey}:spotifyAccessToken`,
//     accessToken,
//     expiration
//   );
// };
//
// export const getSpotifyAccessToken = async () => {
//   return getByKey(`${config.redis.cacheKey}:spotifyAccessToken`);
// };

export const cacheTidalAuthToken = async (authToken: TidalAuthResponse) => {
  return setWithKey(
    `${config.redis.cacheKey}:tidalAccessToken`,
    JSON.stringify(authToken),
    authToken.expires_in
  );
};

export const getTidalAuthToken = async () => {
  const cache = await getByKey(`${config.redis.cacheKey}:tidalAccessToken`);

  if (!cache) {
    return;
  }

  return JSON.parse(cache) as TidalAuthResponse;
};
