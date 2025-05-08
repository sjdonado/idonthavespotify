import { MetadataType, Parser } from '~/config/enum';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';
import type { SearchMetadata } from '~/services/search';
import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

enum TidalMetadataType {
  Song = 'music.song',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'profile',
  Video = 'video.other',
}

const TIDAL_METADATA_TO_METADATA_TYPE = {
  [TidalMetadataType.Song]: MetadataType.Song,
  [TidalMetadataType.Album]: MetadataType.Album,
  [TidalMetadataType.Playlist]: MetadataType.Playlist,
  [TidalMetadataType.Artist]: MetadataType.Artist,
  [TidalMetadataType.Video]: MetadataType.Song,
};

export const getTidalMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.Tidal);
  if (cached) {
    logger.info(`[Tidal] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    const html = await fetchMetadata(link);

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property')?.trim();
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');
    const audio = metaTagContent(doc, 'og:audio', 'property');
    const type = metaTagContent(doc, 'og:type', 'property') as TidalMetadataType;

    if (!title || !description || !type || !image) {
      throw new Error('Tidal metadata not found');
    }

    const metadata = {
      id,
      title,
      description,
      type: TIDAL_METADATA_TO_METADATA_TYPE[type],
      image,
      audio,
    } as SearchMetadata;

    await cacheSearchMetadata(id, Parser.Tidal, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getTidalMetadata.name}] (${link}) ${err}`);
  }
};

export const getTidalQueryFromMetadata = (metadata: SearchMetadata) => {
  let query = metadata.title;

  if (metadata.type === MetadataType.Song || metadata.type === MetadataType.Album) {
    const ogTitlePattern = /^(.*?)\s*-\s*(.*)$/;
    const matches = query.match(ogTitlePattern);

    if (matches) {
      const [, artist, content] = matches;
      if (metadata.type === MetadataType.Song) {
        query = `${content} ${artist}`;
      } else if (metadata.type === MetadataType.Album) {
        query = `${content} ${artist} album`;
      }
    }
  }

  if (metadata.type === MetadataType.Playlist) {
    query = `${query} playlist`;
  }

  return query;
};
