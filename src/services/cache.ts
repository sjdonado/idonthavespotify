import * as config from '~/config/default';

const sqliteStore = require('cache-manager-sqlite');
const cacheManager = require('cache-manager');

import { SearchMetadata } from '~/parsers/spotify';
import { SearchResult } from './search';

export const cacheStore = cacheManager.caching({
  store: sqliteStore,
  name: 'cache',
  path: config.cache.databasePath,
});

export const cacheSearchMetadata = async (searchMetadata: SearchMetadata) => {
  await cacheStore.set(`search:${searchMetadata.url}`, searchMetadata, {
    ttl: config.cache.expTime,
  });
};

export const getCachedSearchMetadata = async (url: SearchMetadata['url']) => {
  const data = (await cacheStore.get(`search:${url}`)) as SearchMetadata;

  return data;
};

export const cacheSearchResult = async (searchResult: SearchResult) => {
  await cacheStore.set(`searchResult:${searchResult.id}`, searchResult, {
    ttl: config.cache.expTime,
  });
};

export const getCachedSearchResult = async (id: SearchResult['id']) => {
  const data = (await cacheStore.get(`searchResult:${id}`)) as SearchResult;

  return data;
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
