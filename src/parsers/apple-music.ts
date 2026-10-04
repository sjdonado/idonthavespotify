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
    `https://music.apple.com/${storefront}/search?term=${encodeURIComponent(term)}&l=${PAGE_LANGUAGE}`
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

// Every storefront serves an English page for this (checked 2026-10-04 on de,
// fr, jp, br, mx, it, nl, se, pl, kr, cn, ru; jp normalizes to en-US), so the
// parser only needs the English og:title shape "<title> by <artist> on Apple
// Music". Share ids keep only a link's first query param, so the user's own
// `l` never survives anyway.
const PAGE_LANGUAGE = 'en-GB';

const withEnglishPage = (link: string) => {
  const url = new URL(link);
  url.searchParams.set('l', PAGE_LANGUAGE);
  return url.toString();
};

const upscaleArtwork = (url?: string) => url?.replace('300x300', '600x600');

const TYPE_WORD: Partial<Record<MetadataType, string>> = {
  [MetadataType.Song]: 'Song',
  [MetadataType.Album]: 'Album',
  [MetadataType.Playlist]: 'Playlist',
  [MetadataType.Artist]: 'Artist',
};

// The card subtitle, in Spotify's "Artist · Type" shape. The query extractor
// below recovers the artist from it, so keep the " · " separator last.
const describe = (artist: string | undefined, type: MetadataType) =>
  [artist, TYPE_WORD[type]].filter(Boolean).join(' · ');

// Same-host resolution chain (never touches the iTunes host): oEmbed for
// exact album/playlist metadata, search-page scrape for songs (song ID
// match) and artists (ID match). Only reached for bot-walled or
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
      let pick: { title: string; artist: string; artwork?: string } | undefined;
      doc('[data-testid="top-search-result"]').each((_, element) => {
        const block = doc(element);
        const [title, , artist] = splitLabel(block.attr('aria-label') ?? '');
        if (!title) return;
        const href = block.find('a[data-testid="click-action"]').attr('href');
        if (!href) return;
        // Match the exact song ID, not the kind label or the title.
        if (new URL(href, link).searchParams.get('i') !== songId) return;
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
          description: describe(pick.artist, MetadataType.Song),
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
          description: describe(undefined, MetadataType.Artist),
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
    description: describe(artist, APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type]),
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
    html = await fetchMetadata(withEnglishPage(actualLink));

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

    // English page (see PAGE_LANGUAGE): "<title> by <artist> on Apple Music"
    // for songs and albums, "<name> on Apple Music" for playlists and artists.
    const withoutSuffix = ogTitle.replace(/\s+on\s+Apple\s+Music$/i, '');
    // Greedy: the artist follows the LAST " by " ("Stand by Me by Ben E.
    // King"). Only songs and albums carry a "by" part.
    const match =
      type === AppleMusicMetadataType.Song || type === AppleMusicMetadataType.Album
        ? withoutSuffix.match(/^(.+)\s+by\s+(.+)$/i)
        : null;
    const title = (match ? match[1] : withoutSuffix).trim();
    const description = describe(
      match?.[2].trim(),
      APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type]
    );

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
  const separator = metadata.description.lastIndexOf(' · ');
  const artist = separator > 0 ? metadata.description.slice(0, separator) : '';
  let query = artist ? `${metadata.title} ${artist}` : metadata.title;

  if (metadata.type === MetadataType.Playlist) {
    query = `${query} playlist`;
  }

  return query;
};
