import * as config from '~/config/default';

const sqliteStore = require('cache-manager-sqlite');
const cacheManager = require('cache-manager');

import { SearchMetadata } from './search';

export const cacheStore = cacheManager.caching({
  store: sqliteStore,
  name: 'cache',
  path: config.cache.databasePath,
});

export const cacheSearchMetadata = async (
  link: string,
  searchMetadata: SearchMetadata
) => {
  await cacheStore.set(`metadata:${link}`, searchMetadata, {
    ttl: config.cache.expTime,
  });
};

export const getCachedSearchMetadata = async (link: string) => {
  const data = (await cacheStore.get(`search:${link}`)) as SearchMetadata;

  return data;
};

export const cacheSpotifyAccessToken = async (accessToken: string, expTime: number) => {
  await cacheStore.set('spotify:accessToken', accessToken, {
    ttl: expTime,
  });
};

export const getCachedSpotifyAccessToken = async () => {
  return cacheStore.get('spotify:accessToken');
};

// export const cacheSearchResult = async (searchResult: SearchResult) => {
//   await cacheStore.set(`searchResult:${searchResult.id}`, searchResult, {
//     ttl: config.cache.expTime,
//   });
// };
//
// export const getCachedSearchResult = async (id: SearchResult['id']) => {
//   const data = (await cacheStore.get(`searchResult:${id}`)) as SearchResult;
//
//   return data;
// };
