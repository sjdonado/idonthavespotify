import { MetadataType, Parser } from '~/config/enum';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';
import type { SearchMetadata } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

enum AppleMusicMetadataType {
  Song = 'music.song',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'music.musician',
}

const APPLE_MUSIC_METADATA_TO_METADATA_TYPE = {
  [AppleMusicMetadataType.Song]: MetadataType.Song,
  [AppleMusicMetadataType.Album]: MetadataType.Album,
  [AppleMusicMetadataType.Playlist]: MetadataType.Playlist,
  [AppleMusicMetadataType.Artist]: MetadataType.Artist,
};

// Generic title served instead of the real page when the client looks like
// a bot. Only reached on runtimes without browser-TLS impersonation.
const BOT_WALL_TITLE = 'Apple Music Web Player';

interface AppleMusicLookupItem {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
}

interface AppleMusicLookupResponse {
  resultCount?: number;
  results?: AppleMusicLookupItem[];
}

const lookup = (params: string) =>
  HttpClient.get<AppleMusicLookupResponse>(
    `https://itunes.apple.com/lookup?${params}`
  ).catch(() => {
    throw new Error('AppleMusic metadata not found');
  });

const searchSongs = (term: string) =>
  HttpClient.get<AppleMusicLookupResponse>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5`
  ).catch(() => {
    throw new Error('AppleMusic metadata not found');
  });

const upscaleArtwork = (url?: string) => url?.replace('100x100', '600x600');

// Fallback over the public iTunes APIs (no auth, not bot-walled).
// Song IDs from links do not resolve via lookup, so songs resolve in two
// steps: album lookup for artist/artwork, then a song search for the exact
// track. Playlists do not resolve at all and keep the original error.
// Only reached for bot-walled or empty pages, which never happens with
// the impit backend.
const getAppleMusicMetadataFromLookup = async (id: string, link: string) => {
  const songId = link.match(/[?&]i=(\d+)/)?.[1];
  const slug = link.match(/\/(?:album|artist|playlist)\/([^/]+)/)?.[1] ?? '';
  const pathId = link.match(/\/(?:album|artist|playlist)\/[^/]*\/([^/?]+)/)?.[1];

  let type = AppleMusicMetadataType.Album;
  if (songId) {
    type = AppleMusicMetadataType.Song;
  } else if (link.includes('playlist')) {
    type = AppleMusicMetadataType.Playlist;
  } else if (link.includes('artist')) {
    type = AppleMusicMetadataType.Artist;
  }

  const fail = () => {
    throw new Error('AppleMusic metadata not found');
  };

  if (type === AppleMusicMetadataType.Song) {
    const album = (await lookup(`id=${pathId}`)).results?.[0];
    const artist = album?.artistName ?? '';
    const query = `${slug.replace(/-/g, ' ')} ${artist}`.trim();
    const track = (await searchSongs(query)).results?.find(
      result => result.trackName
    );
    if (!track?.trackName || !pathId) fail();
    const metadata = {
      title: track!.trackName!,
      description: artist ? `${track!.trackName} ${artist}` : track!.trackName!,
      type: APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type],
      image: upscaleArtwork(track!.artworkUrl100 ?? album?.artworkUrl100),
      audio: track!.previewUrl,
    } as SearchMetadata;
    await cacheSearchMetadata(id, Parser.AppleMusic, metadata);
    return metadata;
  }

  if (!pathId) fail();
  const item = (await lookup(`id=${pathId}`)).results?.[0];
  const title = item?.collectionName ?? item?.artistName ?? item?.trackName;
  const artist = item?.artistName ?? '';
  if (!title) fail();
  const metadata = {
    title,
    description: artist ? `${title} ${artist}` : title!,
    type: APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type],
    image: upscaleArtwork(item?.artworkUrl100),
    audio: item?.previewUrl,
  } as SearchMetadata;
  await cacheSearchMetadata(id, Parser.AppleMusic, metadata);
  return metadata;
};

export const getAppleMusicMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.AppleMusic);
  if (cached) {
    logger.info(`[AppleMusic] (${id}) metadata cache hit`);
    return cached;
  }

  const actualLink = link.replace('geo.music.apple.com', 'music.apple.com');
  let html = '';

  try {
    html = await fetchMetadata(actualLink);

    const doc = getCheerioDoc(html);

    const ogTitle = metaTagContent(doc, 'og:title', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');

    // Extract audio URL from script tags
    let audioUrl: string | undefined;
    const audioUrlRegex = /https:\/\/audio-ssl\.itunes\.apple\.com[^\s"']+\.m4a/;
    doc('script').each((_, element) => {
      const scriptContent = doc(element).html();
      if (scriptContent) {
        const match = scriptContent.match(audioUrlRegex);
        if (match) {
          audioUrl = match[0];
          return false; // Break the loop
        }
      }
    });

    // The wall title uses a non-breaking space (U+00A0) where a normal
    // space would be, so compare whitespace-insensitively.
    const normalizedTitle = ogTitle?.replace(/\s+/g, ' ').trim();
    if (!image || !ogTitle || normalizedTitle === BOT_WALL_TITLE) {
      // NOTE: `return await` is load-bearing here. A bare `return` would let
      // the rejection skip the catch below (standard async semantics).
      return await getAppleMusicMetadataFromLookup(id, actualLink);
    }

    let type = AppleMusicMetadataType.Album;
    if (actualLink.includes('i=')) {
      type = AppleMusicMetadataType.Song;
    }
    if (actualLink.includes('playlist')) {
      type = AppleMusicMetadataType.Playlist;
    }
    if (actualLink.includes('artist')) {
      type = AppleMusicMetadataType.Artist;
    }

    // First, remove "Apple Music" and the preceding word (on/bei/en/sur/etc.)
    const withoutSuffix = ogTitle.replace(
      /\s+(?:on|bei|en|sur|su|no|op|på|w)\s+Apple\s+Music$/i,
      ''
    );

    // Then match the last occurrence of the separator word (by/von/de/etc.)
    // Using greedy match to capture from the LAST separator (handles titles with "de", "di", etc.)
    const titleRegex = /^(.+)\s+(?:by|von|de|par|di|door|av|af|przez)\s+(.+)$/i;
    const match = withoutSuffix.match(titleRegex);

    let title: string;
    let description: string;

    if (match) {
      title = match[1].trim();
      description = `${match[1].trim()} ${match[2].trim()}`;
    } else {
      // Fallback: use the cleaned string as both title and description
      title = withoutSuffix.trim();
      description = title;
    }

    const metadata = {
      id,
      title,
      description,
      type: APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type],
      image,
      audio: audioUrl,
    } as SearchMetadata;

    await cacheSearchMetadata(id, Parser.AppleMusic, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getAppleMusicMetadata.name}] (${actualLink || link}) ${err}`);
  }
};

export const getAppleMusicQueryFromMetadata = (metadata: SearchMetadata) => {
  let query = metadata.description;

  if (metadata.type === MetadataType.Playlist) {
    query = `${query} playlist`;
  }

  return query;
};
