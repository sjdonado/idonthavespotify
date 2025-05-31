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
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');

    if (!songUrl || !image) {
      throw new Error('AppleMusic metadata not found');
    }

    let title = '';
    if (songUrl) {
      const songMatch = songUrl.match(/\/song\/([^\/]+)/);
      if (songMatch && songMatch[1]) {
        const songName = formatName(songMatch[1]);

        const artists: string[] = [];
        doc('meta[property="music:musician"]').each((_, element) => {
          const artistUrl = doc(element).attr('content');
          if (artistUrl) {
            const artistMatch = artistUrl.match(/\/artist\/([^\/]+)/);
            if (artistMatch && artistMatch[1]) {
              artists.push(formatName(artistMatch[1]));
            }
          }
        });

        title = [songName, ...artists].join(' ');
      }
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

    const parsedDescription = description
      ?.replace(/(Listen to\s|on\sApple\sMusic)/gi, '')
      .trim();

    const metadata = {
      id,
      title,
      description: parsedDescription,
      type: APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type],
      image,
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

function formatName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
