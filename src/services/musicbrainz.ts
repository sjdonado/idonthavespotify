import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';
import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheStore } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import { scoreMatch } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getServiceGuard } from '~/utils/service-guard';

// Global fallback for adapters with no result (including Tidal, which has
// no outbound adapter): match the work on MusicBrainz, then reuse its
// curated streaming URL relations as direct links. Verified-only: a weak
// match resolves nothing. Playlists/shows have no MusicBrainz entity.
const MB_API = 'https://musicbrainz.org/ws/2';
const MB_MIN_INTERVAL_MS = 1100;

interface MbCredit {
  name?: string;
}

interface MbItem {
  id: string;
  title?: string;
  name?: string;
  'artist-credit'?: MbCredit[];
}

interface MbSearchResponse {
  recordings?: MbItem[];
  releases?: MbItem[];
  artists?: MbItem[];
}

interface MbRelation {
  type?: string;
  url?: { resource?: string };
}

const MB_ENTITY: Partial<
  Record<MetadataType, { entity: string; list: keyof MbSearchResponse; field: string }>
> = {
  [MetadataType.Song]: { entity: 'recording', list: 'recordings', field: 'recording' },
  [MetadataType.Album]: { entity: 'release', list: 'releases', field: 'release' },
  [MetadataType.Artist]: { entity: 'artist', list: 'artists', field: 'artist' },
  [MetadataType.Podcast]: { entity: 'recording', list: 'recordings', field: 'recording' },
};

const escapeLucene = (value: string): string =>
  value.replace(/([+\-=&|><!(){}[\]^"~*?:\\/])/g, '\\$1');

// Our query builders put the artist after the title ("<title> <artist>",
// albums add a trailing kind word), so recover it for an AND clause that
// disambiguates same-name works. Empty when the query is title-only.
function guessArtist(query: string, title: string, type: MetadataType): string {
  if (type !== MetadataType.Song && type !== MetadataType.Album && type !== MetadataType.Podcast) {
    return '';
  }
  const idx = query.toLowerCase().indexOf(title.toLowerCase());
  if (idx < 0) return '';
  const rest = (query.slice(0, idx) + query.slice(idx + title.length))
    .replace(/\s+/g, ' ')
    .replace(/\s*\b(album|single|ep|playlist|podcast|episode|show)$/i, '')
    .trim();
  return rest;
}

let lastMbAt = 0;
let mbQueue: Promise<void> = Promise.resolve();
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// MusicBrainz asks for ≤1 req/s with an identifying UA. Serialize calls per
// isolate behind a shared queue; tests skip the wait, mocks answer instantly.
async function pace(): Promise<void> {
  const run = mbQueue.then(async () => {
    const testEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    if (!testEnv) {
      const wait = MB_MIN_INTERVAL_MS - (Date.now() - lastMbAt);
      if (wait > 0) await sleep(wait);
    }
    lastMbAt = Date.now();
  });
  mbQueue = run.catch(() => undefined);
  await run;
}

const userAgent = (): string =>
  `idonthavespotify/${ENV.app.version} (https://github.com/sjdonado/idonthavespotify)`;

async function mbGet<T>(url: string): Promise<T> {
  await pace();
  return HttpClient.get<T>(url, {
    headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
    timeout: 10_000,
    retries: 1,
  });
}

async function searchMbids(
  metadata: SearchMetadata,
  query: string
): Promise<{ entity: string; mbids: string[]; cached: boolean } | null> {
  const kind = MB_ENTITY[metadata.type];
  if (!kind) return null;

  const key = `mb:search:${kind.entity}:${metadata.type}:${query}`;
  const cached = await cacheStore.get<{ entity: string; mbids: string[] }>(key);
  if (cached) return { ...cached, cached: true };

  const luceneParts = [`${kind.field}:"${escapeLucene(metadata.title)}"`];
  const artist = guessArtist(query, metadata.title, metadata.type);
  if (artist) luceneParts.push(`artist:"${escapeLucene(artist)}"`);
  const data = await mbGet<MbSearchResponse>(
    `${MB_API}/${kind.entity}/?query=${encodeURIComponent(luceneParts.join(' AND '))}&fmt=json&limit=5`
  );
  const items = data[kind.list] ?? [];
  // Verified hits only, best first; relations are checked in order until the
  // missing platforms are filled (the top hit is not always the linked one).
  const mbids = items
    .map(item => ({
      id: item.id,
      score: scoreMatch(
        [item.title ?? item.name ?? '', (item['artist-credit'] ?? []).map(credit => credit.name).filter(Boolean).join(' ')].join(' '),
        query
      ),
    }))
    .filter(hit => hit.score >= RESPONSE_COMPARE_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(hit => hit.id);
  // Cache empty results briefly too: weak matches re-hit on every search.
  const hit = { entity: kind.entity, mbids, cached: false };
  await cacheStore.set(key, hit, mbids.length === 0 ? 3600 : undefined);
  return mbids.length === 0 ? null : hit;
}

async function fetchRelations(
  entity: string,
  mbid: string
): Promise<{ rels: Array<{ type: string; url: string }>; cached: boolean }> {
  const key = `mb:rels:${entity}:${mbid}`;
  const cached = await cacheStore.get<Array<{ type: string; url: string }>>(key);
  if (cached) return { rels: cached, cached: true };

  const data = await mbGet<{ relations?: MbRelation[] }>(
    `${MB_API}/${entity}/${encodeURIComponent(mbid)}?inc=url-rels&fmt=json`
  );
  const rels = (data.relations ?? [])
    .map(rel => ({ type: rel.type ?? '', url: rel.url?.resource ?? '' }))
    .filter(rel => rel.url.length > 0);
  await cacheStore.set(key, rels);
  return { rels, cached: false };
}

function platformFromHost(host: string): Adapter | null {
  const h = host.toLowerCase();
  if (h === 'open.spotify.com') return Adapter.Spotify;
  if (
    h === 'music.youtube.com' ||
    h === 'youtube.com' ||
    h === 'www.youtube.com' ||
    h === 'm.youtube.com' ||
    h === 'youtu.be'
  ) {
    return Adapter.YouTube;
  }
  if (h === 'music.apple.com' || h === 'geo.music.apple.com') return Adapter.AppleMusic;
  if (h === 'deezer.com' || h === 'www.deezer.com') return Adapter.Deezer;
  if (h === 'soundcloud.com' || h === 'on.soundcloud.com') return Adapter.SoundCloud;
  if (h === 'tidal.com' || h === 'www.tidal.com' || h === 'listen.tidal.com') {
    return Adapter.Tidal;
  }
  if (h === 'open.qobuz.com' || h === 'play.qobuz.com' || h === 'www.qobuz.com') {
    return Adapter.Qobuz;
  }
  if (h.endsWith('.bandcamp.com')) return Adapter.Bandcamp;
  if (h === 'pandora.com' || h === 'www.pandora.com') return Adapter.Pandora;
  return null;
}

function normalizeLink(type: Adapter, raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  if (type === Adapter.AppleMusic && parsed.hostname.toLowerCase() === 'music.apple.com') {
    parsed.hostname = 'geo.music.apple.com';
    return parsed.toString();
  }
  if (type === Adapter.YouTube) {
    const host = parsed.hostname.toLowerCase();
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://music.youtube.com/watch?v=${id}` : null;
    }
    const video = parsed.searchParams.get('v');
    const list = parsed.searchParams.get('list');
    if (video) return `https://music.youtube.com/watch?v=${video}`;
    if (list) return `https://music.youtube.com/playlist?list=${list}`;
    // Channel/user/handle pages stay on youtube.com; only watch and
    // playlist URLs move to the music host.
    if (host === 'music.youtube.com') return parsed.toString();
    return /\/(channel|@[^/]+|user\/[^/]+|c\/[^/]+)/.test(parsed.pathname)
      ? parsed.toString()
      : null;
  }
  if (type === Adapter.Tidal) {
    const match = parsed.pathname.match(
      /(?:browse\/)?(track|album|artist|playlist|mix|video)\/([\w-]+)/
    );
    return match ? `https://tidal.com/browse/${match[1]}/${match[2]}` : null;
  }
  return parsed.toString();
}

function mapRelationToLink(raw: string): SearchResultLink | null {
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    return null;
  }
  const type = platformFromHost(host);
  if (!type) return null;
  const url = normalizeLink(type, raw);
  if (!url) return null;
  return { type, url, isVerified: true };
}

export async function resolveMusicBrainzLinks({
  query,
  metadata,
  missing,
}: {
  query: string;
  metadata: SearchMetadata;
  missing: Adapter[];
}): Promise<SearchResultLink[]> {
  if (missing.length === 0 || !MB_ENTITY[metadata.type]) return [];

  const guard = getServiceGuard('musicBrainz');
  if (!guard.acquire()) {
    logger.warn('[MusicBrainz] service guard: request blocked');
    return [];
  }

  try {
    const hit = await searchMbids(metadata, query);
    // A clean no-match is a healthy response, not a failure — but only when
    // the service was actually probed. Silent cache hits touch nothing, so
    // they neither reset failures nor record them.
    if (!hit) {
      guard.recordSuccess();
      return [];
    }
    if (hit.mbids.length === 0) return [];

    const resolved: SearchResultLink[] = [];
    let probed = !hit.cached;
    for (const mbid of hit.mbids) {
      const { rels, cached } = await fetchRelations(hit.entity, mbid);
      if (!cached) probed = true;
      for (const rel of rels) {
        // Only playback relations become links: lyrics pages, social
        // profiles, and the like must never certify as verified results.
        if (!/stream|download|purchase/i.test(rel.type)) continue;
        const link = mapRelationToLink(rel.url);
        if (!link || !missing.includes(link.type)) continue;
        if (resolved.some(existing => existing.type === link.type)) continue;
        resolved.push(link);
      }
      if (missing.every(adapter => resolved.some(link => link.type === adapter))) break;
    }
    if (probed) guard.recordSuccess();

    logger.info(
      `[MusicBrainz] fallback filled: ${resolved.map(link => link.type).join(',') || 'none'}`
    );
    return resolved;
  } catch (error) {
    guard.recordFailure();
    logger.error(`[MusicBrainz] ${error}`);
    return [];
  }
}
