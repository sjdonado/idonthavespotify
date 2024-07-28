import { MetadataType, Parser } from '~/config/enum';

import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

import { SearchMetadata } from '~/services/search';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';

enum DeezerMetadataType {
  Song = 'music.song',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'music.musician',
}

const DEEZER_METADATA_TO_METADATA_TYPE = {
  [DeezerMetadataType.Song]: MetadataType.Song,
  [DeezerMetadataType.Album]: MetadataType.Album,
  [DeezerMetadataType.Playlist]: MetadataType.Playlist,
  [DeezerMetadataType.Artist]: MetadataType.Artist,
};

export const getDeezerMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.Deezer);
  if (cached) {
    logger.info(`[Deezer] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    const html = await fetchMetadata(link, {});

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');
    const type = metaTagContent(doc, 'og:type', 'property');
    const audio = metaTagContent(doc, 'og:audio', 'property');

    if (!title || !type || !image) {
      throw new Error('Deezer metadata not found');
    }

    const parsedTitle = title?.trim();

    const metadata = {
      id,
      title: parsedTitle,
      description,
      type: DEEZER_METADATA_TO_METADATA_TYPE[type as DeezerMetadataType],
      image,
      audio,
    } as SearchMetadata;

    await cacheSearchMetadata(id, Parser.Deezer, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getDeezerMetadata.name}] (${link}) ${err}`);
  }
};

export const getDeezerQueryFromMetadata = (metadata: SearchMetadata) => {
  let query = metadata.title;

  const artists = metadata.description.match(/^([^ -]+(?: [^ -]+)*)/)?.[1];

  if (metadata.type === MetadataType.Song) {
    query = [query, artists].join(' ');
  }

  if (metadata.type === MetadataType.Album) {
    query = [query, artists].join(' ');
  }

  if (metadata.type === MetadataType.Playlist) {
    query = `${query} playlist`;
  }

  return query;
};
