import type { SpotifyContent } from '~/@types/global';

import { setKey, getKey } from '~/server/utils/redis';

import { cacheKey } from '~/config/redis';

export const getSpotifyContentFromCache = async (id: string) => {
  const cache = await getKey(`${cacheKey}${id}`);

  if (!cache) {
    return undefined;
  }

  return JSON.parse(cache) as SpotifyContent;
};

export const cacheSpotifyContent = async (spotifyContent: SpotifyContent) => {
  await setKey(`${cacheKey}${spotifyContent.id}`, JSON.stringify(spotifyContent), true);
};
