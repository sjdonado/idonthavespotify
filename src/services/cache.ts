const sqliteStore = require('cache-manager-sqlite');
const cacheManager = require('cache-manager');

import { ENV } from '~/config/env';
import { SearchMetadata, SearchResultLink } from './search';

export const cacheStore = cacheManager.caching({
  store: sqliteStore,
  name: 'cache',
  path: ENV.cache.databasePath,
});

export const cacheSearchResultLink = async (
  url: URL,
  searchResultLink: SearchResultLink
) => {
  await cacheStore.set(`search:${url.toString()}`, searchResultLink, {
    ttl: ENV.cache.expTime,
  });
};

export const getCachedSearchResultLink = async (url: URL) => {
  const data = (await cacheStore.get(`search:${url.toString()}`)) as SearchResultLink;

  return data;
};

export const cacheSearchMetadata = async (id: string, searchMetadata: SearchMetadata) => {
  await cacheStore.set(`metadata:${id}`, searchMetadata, {
    ttl: ENV.cache.expTime,
  });
};

export const getCachedSearchMetadata = async (id: string) => {
  const data = (await cacheStore.get(`metadata:${id}`)) as SearchMetadata;

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
