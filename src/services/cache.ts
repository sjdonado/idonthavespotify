import { SearchMetadata } from '~/parsers/spotify';
import { SearchResult } from './search';

const inMemoryCache = {} as Record<string, string>;

export const cacheSearchMetadata = (searchMetadata: SearchMetadata) => {
  Object.assign(inMemoryCache, {
    [`search:${searchMetadata.url}`]: JSON.stringify(searchMetadata),
  });
};

export const getCachedSearchMetadata = (url: SearchMetadata['url']) => {
  const data = inMemoryCache[`search:${url}`];

  if (!data) {
    return;
  }

  return JSON.parse(data) as SearchMetadata;
};

export const cacheSearchResult = (searchResult: SearchResult) => {
  Object.assign(inMemoryCache, {
    [`searchResult:${searchResult.id}`]: JSON.stringify(searchResult),
  });
};

export const getCachedSearchResult = (id: SearchResult['id']) => {
  const data = inMemoryCache[`searchResult:${id}`];

  if (!data) {
    return;
  }

  return JSON.parse(data) as SearchResult;
};

// TODO: https://github.com/sjdonado/idonthavespotify/issues/6
/* export const cacheSpotifyAccessToken = async (
  accessToken: string,
  expiration: number
) => {
  return setWithKey(
    `${config.redis.cacheKey}:spotifyAccessToken`,
    accessToken,
    expiration
  );
};

export const getSpotifyAccessToken = async () => {
  return getByKey(`${config.redis.cacheKey}:spotifyAccessToken`);
}; */
