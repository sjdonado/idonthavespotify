import { caching } from 'cache-manager';
import bunSqliteStore from 'cache-manager-bun-sqlite3';

import { ENV } from '~/config/env';
import type { Parser } from '~/config/enum';

import { SearchMetadata, SearchResultLink } from './search';

export const cacheStore = await caching(bunSqliteStore, {
  name: 'cache',
  path: ENV.cache.databasePath,
  ttl: ENV.cache.expTime,
});

export const cacheSearchResultLink = async (
  url: URL,
  searchResultLink: SearchResultLink
) => {
  await cacheStore.set(`search:${url.toString()}`, searchResultLink);
};

export const getCachedSearchResultLink = async (url: URL) => {
  const data = (await cacheStore.get(`search:${url.toString()}`)) as SearchResultLink;

  return data;
};

export const cacheSearchMetadata = async (
  id: string,
  parser: Parser,
  searchMetadata: SearchMetadata
) => {
  await cacheStore.set(`metadata:${parser}:${id}`, searchMetadata);
};

export const getCachedSearchMetadata = async (id: string, parser: Parser) => {
  const data = (await cacheStore.get(`metadata:${parser}:${id}`)) as SearchMetadata;

  return data;
};

export const cacheSpotifyAccessToken = async (accessToken: string, expTime: number) => {
  await cacheStore.set('spotify:accessToken', accessToken, expTime);
};

export const getCachedSpotifyAccessToken = async (): Promise<string | undefined> => {
  return cacheStore.get('spotify:accessToken');
};

export const cacheShortenLink = async (link: string, refer: string) => {
  await cacheStore.set(`url-shortener:${link}`, refer);
};

export const getCachedShortenLink = async (link: string): Promise<string | undefined> => {
  return cacheStore.get(`url-shortener:${link}`);
};
