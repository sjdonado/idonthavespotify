import { MetadataType } from '~/config/enum';

import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

import { SearchMetadata } from '~/services/search';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';

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
  const cached = await getCachedSearchMetadata(id);
  if (cached) {
    logger.info(`[AppleMusic] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    const html = await fetchMetadata(link, {});

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');
    const type = metaTagContent(doc, 'og:type', 'property');

    if (!title || !type || !image) {
      throw new Error('AppleMusic metadata not found');
    }

    const parsedTitle = title?.replace(/on\sApple\sMusic/i, '').trim();

    const metadata = {
      id,
      title: parsedTitle,
      description,
      type: APPLE_MUSIC_METADATA_TO_METADATA_TYPE[type as AppleMusicMetadataType],
      image,
    } as SearchMetadata;

    await cacheSearchMetadata(id, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getAppleMusicMetadata.name}] (${link}) ${err}`);
  }
};

export const getAppleMusicQueryFromMetadata = (metadata: SearchMetadata) => {
  let query = metadata.title;

  if (metadata.type === MetadataType.Album) {
    query = `${query} album`;
  }

  if (metadata.type === MetadataType.Playlist) {
    query = `${query} playlist`;
  }

  return query;
};
