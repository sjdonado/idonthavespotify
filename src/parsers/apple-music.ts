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

interface AppleMusicOEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
}

const fetchOEmbed = (link: string) =>
  HttpClient.get<AppleMusicOEmbedResponse>(
    `https://music.apple.com/api/oembed?url=${encodeURIComponent(link)}`
  ).catch(() => null);

const storefrontOf = (link: string) =>
  link.match(/music\.apple\.com\/([a-z]{2})/)?.[1] ?? 'us';

const searchAppleMusic = (storefront: string, term: string) =>
  HttpClient.get<string>(
    `https://music.apple.com/${storefront}/search?term=${encodeURIComponent(term)}`
  ).catch(() => null);

const splitLabel = (label: string): [string, string, string] => {
  const parts = label
    .replace(/\s+/g, ' ')
    .split('·')
    .map(part => part.trim());
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
};

const lastSrcsetUrl = (srcset?: string) =>
  srcset?.split(',').pop()?.trim().split(' ')[0] || undefined;

const normalizeWords = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const upscaleArtwork = (url?: string) => url?.replace('300x300', '600x600');

// Same-host resolution chain (never touches the iTunes host): oEmbed for
// exact album/playlist metadata, search-page scrape for songs (slug plus
// album match) and artists (ID match). Only reached for bot-walled or
// empty pages, which never happens with the impit backend.
const getAppleMusicMetadataFromCatalog = async (id: string, link: string) => {
  const fail = (): never => {
    throw new Error('AppleMusic metadata not found');
  };

  const songId = link.match(/[?&]i=(\d+)/)?.[1];
  const slug = link.match(/\/(?:album|artist|playlist)\/([^/]+)/)?.[1] ?? '';
  const pathId = link.match(/\/(?:album|artist|playlist)\/[^/]*\/([^/?]+)/)?.[1];
  const storefront = storefrontOf(link);

  let type = AppleMusicMetadataType.Album;
  if (songId) {
    type = AppleMusicMetadataType.Song;
  } else if (link.includes('playlist')) {
    type = AppleMusicMetadataType.Playlist;
  } else if (link.includes('artist')) {
    type = AppleMusicMetadataType.Artist;
  }

  if (type === AppleMusicMetadataType.Song) {
    if (!pathId) fail();
    const html = await searchAppleMusic(storefront, slug.replace(/-/g, ' '));
    if (html) {
      const doc = getCheerioDoc(html);
      const wantTitle = normalizeWords(slug.replace(/-/g, ' '));
      let pick: { title: string; artist: string; artwork?: string } | undefined;
      doc('[data-testid="top-search-result"]').each((_, element) => {
        const block = doc(element);
        const [title, kind, artist] = splitLabel(block.attr('aria-label') ?? '');
        if (kind !== 'Song' || !title) return;
        const href = block.find('a[data-testid="click-action"]').attr('href') ?? '';
        if (!href.includes('/album/') || !href.includes(`/${pathId}`)) return;
        const normalizedTitle = normalizeWords(title);
        if (normalizedTitle !== wantTitle && !normalizedTitle.startsWith(wantTitle)) {
          return;
        }
        pick = {
          title,
          artist,
          artwork: lastSrcsetUrl(block.find('picture source').attr('srcset')),
        };
        return false;
      });
      if (pick) {
        const metadata = {
          title: pick.title,
          description: pick.artist ? `${pick.title} ${pick.artist}` : pick.title,
          type: APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type],
          image: pick.artwork,
          audio: undefined,
        } as SearchMetadata;
        await cacheSearchMetadata(id, Parser.AppleMusic, metadata);
        return metadata;
      }
    }
    fail();
  }

  if (type === AppleMusicMetadataType.Artist) {
    if (!pathId) fail();
    const html = await searchAppleMusic(storefront, slug.replace(/-/g, ' '));
    if (html) {
      const doc = getCheerioDoc(html);
      let pick: { title: string; artwork?: string } | undefined;
      doc('[data-testid="top-search-result"]').each((_, element) => {
        const block = doc(element);
        const href =
          block.find('a[data-testid="click-action"]').attr('href') ??
          block.find(`a[href*="/artist/"][href*="${pathId}"]`).attr('href') ??
          '';
        if (!href.includes('/artist/') || !href.includes(`/${pathId}`)) return;
        const [title] = splitLabel(block.attr('aria-label') ?? '');
        if (!title) return;
        pick = {
          title,
          artwork: lastSrcsetUrl(block.find('picture source').attr('srcset')),
        };
        return false;
      });
      if (pick) {
        const metadata = {
          title: pick.title,
          description: pick.title,
          type: APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type],
          image: pick.artwork,
          audio: undefined,
        } as SearchMetadata;
        await cacheSearchMetadata(id, Parser.AppleMusic, metadata);
        return metadata;
      }
    }
    fail();
  }

  const embedded = await fetchOEmbed(link);
  const title = embedded?.title;
  const artist = embedded?.author_name ?? '';
  if (!title) fail();
  const metadata = {
    title,
    description: artist ? `${title} ${artist}` : title,
    type: APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type],
    image: upscaleArtwork(embedded?.thumbnail_url),
    audio: undefined,
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
      return await getAppleMusicMetadataFromCatalog(id, actualLink);
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
