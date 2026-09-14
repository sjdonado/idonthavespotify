// PATCHED VERSION OF UPSTREAM src/parsers/spotify.ts
//
// As of 2026, open.spotify.com no longer ships server-side OG meta
// tags for resource pages — only `og:site_name` is present, the rest
// are rendered client-side by the SPA. So scraping `og:title` /
// `og:description` / `og:image` from the resource page returns null
// and every Spotify-as-source request 500s with "Spotify metadata
// not found".
//
// This patch replaces the OG-tag scrape with a fetch of
// /embed/<type>/<id>, which still server-renders a Next.js
// __NEXT_DATA__ JSON blob containing all the metadata we need
// (name, artists, release date, image, audio preview).
//
// Applied at build time by scripts/build-backend.sh so the upstream
// submodule stays clean. When the upstream maintainer ships a fix
// for this, drop this file + the cp step from the build script.
import {
  SPOTIFY_LINK_DESKTOP_REGEX,
  SPOTIFY_LINK_MOBILE_REGEX,
} from '~/config/constants';
import { MetadataType, Parser } from '~/config/enum';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { type SearchMetadata } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

enum SpotifyMetadataType {
  Song = 'music.song',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'profile',
  Podcast = 'music.episode',
  Show = 'website',
}

const SPOTIFY_METADATA_TO_METADATA_TYPE = {
  [SpotifyMetadataType.Song]: MetadataType.Song,
  [SpotifyMetadataType.Album]: MetadataType.Album,
  [SpotifyMetadataType.Playlist]: MetadataType.Playlist,
  [SpotifyMetadataType.Artist]: MetadataType.Artist,
  [SpotifyMetadataType.Podcast]: MetadataType.Podcast,
  [SpotifyMetadataType.Show]: MetadataType.Show,
};

const NEXT_DATA_REGEX = /<script id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s;

const SPOTIFY_TYPE_TO_METADATA: Record<string, SpotifyMetadataType> = {
  track: SpotifyMetadataType.Song,
  album: SpotifyMetadataType.Album,
  artist: SpotifyMetadataType.Artist,
  playlist: SpotifyMetadataType.Playlist,
  episode: SpotifyMetadataType.Podcast,
  show: SpotifyMetadataType.Show,
};

interface SpotifyEntity {
  name?: string;
  title?: string;
  subtitle?: string;
  artists?: Array<{ name?: string }>;
  releaseDate?: { isoString?: string };
  visualIdentity?: { image?: Array<{ url?: string; maxWidth?: number }> };
  coverArt?: { sources?: Array<{ url?: string }> };
  audioPreview?: { url?: string };
  type?: string;
  uri?: string;
}

function parseSpotifyResourceFromLink(
  link: string
): { type: string; id: string } | null {
  const m = link.match(
    /open\.spotify\.com\/(track|album|artist|playlist|episode|show)\/([A-Za-z0-9]+)/
  );
  if (!m) return null;
  return { type: m[1], id: m[2] };
}

// __NEXT_DATA__ nests the entity under pageProps somewhere; walk
// (bounded) for the first object with our expected shape. We use
// (name + uri + type) as the entity signature — works for tracks,
// albums, artists, playlists, episodes, and shows.
function findEntity(o: unknown, depth = 0): SpotifyEntity | null {
  if (depth > 8 || o === null || typeof o !== 'object') return null;
  const obj = o as Record<string, unknown>;
  if (
    typeof obj.name === 'string' &&
    typeof obj.uri === 'string' &&
    typeof obj.type === 'string'
  ) {
    return obj as SpotifyEntity;
  }
  for (const v of Object.values(obj)) {
    const r = findEntity(v, depth + 1);
    if (r) return r;
  }
  return null;
}

export const getSpotifyMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.Spotify);
  if (cached) {
    logger.info(`[Spotify] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    let resolvedLink = link;
    if (SPOTIFY_LINK_MOBILE_REGEX.test(resolvedLink)) {
      const html = await HttpClient.get<string>(resolvedLink, { retries: 2 });
      resolvedLink = html.match(SPOTIFY_LINK_DESKTOP_REGEX)?.[0] ?? '';
      if (!resolvedLink) throw new Error('Invalid mobile spotify link');
      logger.info(
        `[${getSpotifyMetadata.name}] resolved mobile -> ${resolvedLink}`
      );
    }

    const resource = parseSpotifyResourceFromLink(resolvedLink);
    if (!resource) throw new Error('Unrecognised Spotify URL');

    const embedURL = `https://open.spotify.com/embed/${resource.type}/${resource.id}`;
    logger.info(`[${getSpotifyMetadata.name}] fetching embed: ${embedURL}`);
    const html = await HttpClient.get<string>(embedURL, { retries: 2 });

    const nextDataMatch = html.match(NEXT_DATA_REGEX);
    if (!nextDataMatch) {
      throw new Error('Spotify embed page missing __NEXT_DATA__');
    }

    const nextData = JSON.parse(nextDataMatch[1]);
    const entity = findEntity(nextData);
    if (!entity) throw new Error('Spotify metadata not found');

    const title = (entity.name ?? entity.title ?? '').trim();
    // Tracks have an `artists[]` array; albums/artists/etc. expose
    // the artist as `subtitle` instead.
    const artists = Array.isArray(entity.artists) && entity.artists.length > 0
      ? entity.artists.map(a => a.name).filter(Boolean).join(', ')
      : (entity.subtitle ?? '');
    const year = entity.releaseDate?.isoString
      ? new Date(entity.releaseDate.isoString).getUTCFullYear().toString()
      : '';

    // Match the legacy `og:description` shape "Artist · Type · Year"
    // so getSpotifyQueryFromMetadata's `^([^·]+)\s+·` regex still works.
    const typeWord =
      resource.type === 'track'
        ? 'Song'
        : resource.type === 'episode'
          ? 'Episode'
          : resource.type.charAt(0).toUpperCase() + resource.type.slice(1);
    const descriptionParts = [artists, typeWord];
    if (year) descriptionParts.push(year);
    const description = descriptionParts.filter(Boolean).join(' · ');

    const images = Array.isArray(entity.visualIdentity?.image)
      ? entity.visualIdentity!.image!
      : [];
    const largest = images.reduce<{ url?: string; maxWidth?: number } | null>(
      (best, img) =>
        !best || (img.maxWidth ?? 0) > (best.maxWidth ?? 0) ? img : best,
      null
    );
    const image = largest?.url ?? entity.coverArt?.sources?.[0]?.url;

    const audio = entity.audioPreview?.url ?? undefined;

    const spotifyType = SPOTIFY_TYPE_TO_METADATA[resource.type];
    if (!title || !image || !spotifyType) {
      throw new Error('Spotify metadata not found');
    }

    const metadata = {
      id,
      title,
      description,
      type: SPOTIFY_METADATA_TO_METADATA_TYPE[spotifyType],
      image,
      audio,
    } as SearchMetadata;

    await cacheSearchMetadata(id, Parser.Spotify, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getSpotifyMetadata.name}] (${link}) ${err}`);
  }
};

export const getSpotifyQueryFromMetadata = (metadata: SearchMetadata) => {
  const parsedTitle = metadata.title
    .replace(
      /(\s(?:–|-)\s.*?\s(?:by|von|de|par|di|door|av|af|przez)\s.+)?\s\|\sSpotify$/i,
      ''
    )
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}·]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  let artist = '';

  if (metadata.type === MetadataType.Song || metadata.type === MetadataType.Album) {
    [, artist] = metadata.description.match(/^([^·]+)\s+·/) ?? [];
  } else if (metadata.type === MetadataType.Podcast) {
    [, artist] = metadata.description.match(/from\s(.+?)\son\sSpotify\./) ?? [];
  }

  const query = artist ? `${parsedTitle} ${artist.trim()}` : parsedTitle;

  return query;
};
