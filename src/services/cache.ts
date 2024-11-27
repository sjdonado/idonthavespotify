import { caching } from 'cache-manager';
import bunSqliteStore from 'cache-manager-bun-sqlite3';

import type { Adapter, Parser } from '~/config/enum';
import { ENV } from '~/config/env';

import { SearchMetadata, SearchResultLink } from './search';

export type AccessToken = {
  accessToken: string;
  expiresAt: number;
};

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

export const cacheSpotifyAccessToken = async (token: AccessToken, expTime: number) => {
  await cacheStore.set('spotify:accessToken', token, expTime);
};

export const getCachedSpotifyAccessToken = async (): Promise<AccessToken | undefined> => {
  return await cacheStore.get<AccessToken>('spotify:accessToken');
};

export const cacheTidalAccessToken = async (token: AccessToken, expTime: number) => {
  await cacheStore.set('tidal:accessToken', token, expTime);
};

export const getCachedTidalAccessToken = async (): Promise<AccessToken | undefined> => {
  return await cacheStore.get<AccessToken>('tidal:accessToken');
};

export const cacheTidalUniversalLinkResponse = async (
  link: string,
  response: Record<Adapter, SearchResultLink | null>
) => {
  await cacheStore.set(`tidal:universalLink:${link}`, response);
};

export const getCachedTidalUniversalLinkResponse = async (
  link: string
): Promise<Record<Adapter, SearchResultLink | null> | undefined> => {
  return cacheStore.get(`tidal:universalLink:${link}`);
};

export const cacheShortenLink = async (link: string, refer: string) => {
  await cacheStore.set(`url-shortener:${link}`, refer);
};

export const getCachedShortenLink = async (link: string): Promise<string | undefined> => {
  return cacheStore.get(`url-shortener:${link}`);
};
