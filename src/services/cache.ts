import type { Adapter, Parser } from '~/config/enum';
import { ENV } from '~/config/env';

import { type SearchMetadata, type SearchResultLink } from './search';

export type AccessToken = {
  accessToken: string;
  expiresAt: number;
};

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private lastCleanup = 0;
  private static readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  set<T>(key: string, value: T, ttl?: number): void {
    // Opportunistic cleanup (no timers: Workers forbids them in global
    // scope, and this instance is constructed at module load). TTL resolved
    // per call so edge bindings set after module load still apply.
    const now = Date.now();
    if (now - this.lastCleanup >= InMemoryCache.CLEANUP_INTERVAL_MS) {
      this.lastCleanup = now;
      this.cleanup();
    }
    const expiresAt = now + (ttl || ENV.cache.expTime) * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  reset(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const cache = new InMemoryCache();
export const cacheStore = {
  async get<T>(key: string): Promise<T | undefined> {
    return cache.get<T>(key);
  },

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    cache.set(key, value, ttl);
  },

  async del(key: string): Promise<void> {
    cache.del(key);
  },

  reset(): void {
    cache.reset();
  },
};

// Search result link caching
export const cacheSearchResultLink = async (
  adapter: Adapter,
  sourceParser: Parser,
  sourceId: string,
  searchResultLink: SearchResultLink
): Promise<void> => {
  cache.set(`search:${adapter}:${sourceParser}:${sourceId}`, searchResultLink);
};

export const getCachedSearchResultLink = async (
  adapter: Adapter,
  sourceParser: Parser,
  sourceId: string
): Promise<SearchResultLink | null> => {
  const data = cache.get<SearchResultLink>(
    `search:${adapter}:${sourceParser}:${sourceId}`
  );
  return data || null;
};

// Search metadata caching
export const cacheSearchMetadata = async (
  id: string,
  parser: Parser,
  searchMetadata: SearchMetadata
): Promise<void> => {
  cache.set(`metadata:${parser}:${id}`, searchMetadata);
};

export const getCachedSearchMetadata = async (
  id: string,
  parser: Parser
): Promise<SearchMetadata | null> => {
  const data = cache.get<SearchMetadata>(`metadata:${parser}:${id}`);
  return data || null;
};

// Tidal access token caching
export const cacheTidalAccessToken = async (
  token: AccessToken,
  expTime: number
): Promise<void> => {
  cache.set('tidal:accessToken', token, expTime);
};

export const getCachedTidalAccessToken = async (): Promise<AccessToken | undefined> => {
  return cache.get<AccessToken>('tidal:accessToken');
};

// Spotify access token caching
export const cacheSpotifyAccessToken = async (
  token: AccessToken,
  expTime: number
): Promise<void> => {
  cache.set('spotify:accessToken', token, expTime);
};

export const getCachedSpotifyAccessToken = async (): Promise<AccessToken | undefined> => {
  return cache.get<AccessToken>('spotify:accessToken');
};

// Tidal universal link response caching
export const cacheTidalUniversalLinkResponse = async (
  link: string,
  response: Record<Adapter, SearchResultLink | null>
): Promise<void> => {
  cache.set(`tidal:universalLink:${link}`, response);
};

export const getCachedTidalUniversalLinkResponse = async (
  link: string
): Promise<Record<Adapter, SearchResultLink | null> | undefined> => {
  return cache.get(`tidal:universalLink:${link}`);
};
