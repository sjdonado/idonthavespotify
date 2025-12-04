import { MetadataType, Parser } from '~/config/enum';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';
import type { SearchMetadata } from '~/services/search';
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

    const songUrl = metaTagContent(doc, 'music:song', 'property');
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

    if (!songUrl || !image || !ogTitle) {
      throw new Error('AppleMusic metadata not found');
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
  let query = metadata.title;

  if (metadata.type === MetadataType.Playlist) {
    query = `${query} playlist`;
  }

  return query;
};
