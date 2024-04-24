import * as config from '~/config/default';

import { SpotifyContent } from './search';

const cache = {} as Record<string, string>;

export const cacheSpotifySearch = (spotifyContent: SpotifyContent) => {
  Object.assign(cache, {
    [`${spotifyContent.id}`]: JSON.stringify(spotifyContent),
  });
};

export const getSpotifySearchFromCache = async (id: string) => {
  if (id.length === 0) {
    return;
  }

  const data = cache[id];

  if (!data) {
    return;
  }

  return JSON.parse(data) as SpotifyContent;
};

// TODO: https://github.com/sjdonado/idonthavespotify/issues/6
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
