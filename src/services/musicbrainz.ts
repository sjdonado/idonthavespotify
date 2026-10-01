import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';
import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheStore } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import { scoreMatch } from '~/utils/compare';
import HttpClient, { HttpClientError } from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getServiceGuard } from '~/utils/service-guard';

// Global fallback for adapters with no result (including Tidal, which has
// no outbound adapter): match the work on MusicBrainz, then reuse its
// curated streaming URL relations as direct links. Verified-only: a weak
// match resolves nothing. Playlists/shows have no MusicBrainz entity.
const MB_API = 'https://musicbrainz.org/ws/2';
const MB_MIN_INTERVAL_MS = 1100;
// Soft cap on title-search relation lookups (each paced ~1.1 s): no new
// lookup starts once this much time has passed since the first one.
const MB_BUDGET_MS = 3000;

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
  // missing platforms are filled (the top hit is not always the linked one:
  // identical titles score ties, so check every returned hit).
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
    .slice(0, 5)
    .map(hit => hit.id);
  // Cache empty results briefly too: weak matches re-hit on every search.
  const hit = { entity: kind.entity, mbids, cached: false };
  await cacheStore.set(key, hit, mbids.length === 0 ? 3600 : undefined);
  return mbids.length === 0 ? null : hit;
}

// Recordings sharing an ISRC, with their URL relations, in one request. An
// unknown ISRC answers 404: that is an empty result, not a failure.
async function fetchIsrcRelations(
  isrc: string
): Promise<{ rels: Array<{ type: string; url: string }>; cached: boolean }> {
  const key = `mb:isrc:${isrc}`;
  const cached = await cacheStore.get<Array<{ type: string; url: string }>>(key);
  if (cached) return { rels: cached, cached: true };

  let data: { recordings?: Array<{ relations?: MbRelation[] }> };
  try {
    data = await mbGet(`${MB_API}/isrc/${encodeURIComponent(isrc)}?inc=url-rels&fmt=json`);
  } catch (error) {
    if (!(error instanceof HttpClientError && error.status === 404)) throw error;
    logger.info(`[MusicBrainz] unknown ISRC ${isrc}: ${error.body ?? ''}`);
    data = {};
  }
  const rels = (data.recordings ?? [])
    .flatMap(recording => recording.relations ?? [])
    .map(rel => ({ type: rel.type ?? '', url: rel.url?.resource ?? '' }))
    .filter(rel => rel.url.length > 0);
  // Unknown ISRCs are cached briefly: MusicBrainz keeps gaining them.
  await cacheStore.set(key, rels, rels.length === 0 ? 3600 : undefined);
  return { rels, cached: false };
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
  if (h === 'podcasts.apple.com') return Adapter.ApplePodcasts;
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
  if (h === 'jiosaavn.com' || h === 'www.jiosaavn.com') return Adapter.Jiosaavn;
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
  isrc,
  budgetMs = MB_BUDGET_MS,
}: {
  query: string;
  metadata: SearchMetadata;
  missing: Adapter[];
  isrc?: string;
  budgetMs?: number;
}): Promise<SearchResultLink[]> {
  if (missing.length === 0 || !MB_ENTITY[metadata.type]) return [];

  const guard = getServiceGuard('musicBrainz');
  if (!guard.acquire()) {
    logger.warn('[MusicBrainz] service guard: request blocked');
    return [];
  }

  // Only adapters a relation can fill count toward "done": podcast rows never
  // come from a song, and the RSS feed never comes from MusicBrainz.
  const fillable = missing.filter(
    adapter =>
      adapter !== Adapter.PodcastFeed &&
      (adapter !== Adapter.ApplePodcasts || metadata.type === MetadataType.Podcast)
  );
  if (fillable.length === 0) return [];
  const startedAt = Date.now();
  const resolved: SearchResultLink[] = [];
  const done = () =>
    fillable.every(adapter => resolved.some(link => link.type === adapter));
  const collect = (rels: Array<{ type: string; url: string }>) => {
    for (const rel of rels) {
      // Only playback relations become links: lyrics pages, social
      // profiles, and the like must never certify as verified results.
      if (!/stream|download|purchase/i.test(rel.type)) continue;
      const link = mapRelationToLink(rel.url);
      if (!link || !missing.includes(link.type)) continue;
      if (resolved.some(existing => existing.type === link.type)) continue;
      resolved.push(link);
    }
  };
  const report = () =>
    logger.info(
      `[MusicBrainz] fallback filled: ${resolved.map(link => link.type).join(',') || 'none'} (${Date.now() - startedAt}ms)`
    );

  try {
    let probed = false;

    // ISRC first: one request, every recording sharing the ISRC, no ranking
    // ties (title searches return an arbitrary slice of equal-score hits).
    if (isrc && metadata.type === MetadataType.Song) {
      try {
        const { rels, cached } = await fetchIsrcRelations(isrc);
        if (!cached) probed = true;
        collect(rels);
      } catch (error) {
        // An ISRC outage must not cost the title-search backup.
        guard.recordFailure();
        logger.error(`[MusicBrainz] ISRC ${isrc}: ${error}`);
      }
      if (done()) {
        if (probed) guard.recordSuccess();
        report();
        return resolved;
      }
    }

    const hit = await searchMbids(metadata, query);
    // A clean no-match is a healthy response, not a failure — but only when
    // the service was actually probed. Silent cache hits touch nothing, so
    // they neither reset failures nor record them.
    if (!hit) {
      guard.recordSuccess();
      report();
      return resolved;
    }
    if (!hit.cached) probed = true;

    const lookupsStartedAt = Date.now();
    for (const [index, mbid] of hit.mbids.entries()) {
      // Paced lookups cost ~1.1 s each: past the budget, keep what we have.
      if (Date.now() - lookupsStartedAt >= budgetMs) {
        logger.info(
          `[MusicBrainz] budget spent, skipped ${hit.mbids.length - index} candidate(s)`
        );
        break;
      }
      const { rels, cached } = await fetchRelations(hit.entity, mbid);
      if (!cached) probed = true;
      collect(rels);
      if (done()) break;
    }
    if (probed) guard.recordSuccess();

    report();
    return resolved;
  } catch (error) {
    guard.recordFailure();
    logger.error(`[MusicBrainz] ${error}`);
    // Links found before the failure are still verified relations.
    return resolved;
  }
}
