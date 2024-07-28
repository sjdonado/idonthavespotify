import { MetadataType, Parser } from '~/config/enum';

import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

import { SearchMetadata } from '~/services/search';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';

enum SoundCloudMetadataType {
  Song = 'music.song',
  Album = 'music.playlist',
  Artist = 'music.musician',
}

const SOUNDCLOUD_METADATA_TO_METADATA_TYPE = {
  [SoundCloudMetadataType.Song]: MetadataType.Song,
  [SoundCloudMetadataType.Album]: MetadataType.Album,
  [SoundCloudMetadataType.Artist]: MetadataType.Artist,
};

export const getSoundCloudMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.SoundCloud);
  if (cached) {
    logger.info(`[SoundCloud] (${id}) metadata cache hit`);
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
      throw new Error('SoundCloud metadata not found');
    }

    const parsedTitle = title?.trim();

    const metadata = {
      id,
      title: parsedTitle,
      description,
      type: SOUNDCLOUD_METADATA_TO_METADATA_TYPE[type as SoundCloudMetadataType],
      image,
    } as SearchMetadata;

    await cacheSearchMetadata(id, Parser.SoundCloud, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getSoundCloudMetadata.name}] (${link}) ${err}`);
  }
};

export const getSoundCloudQueryFromMetadata = (metadata: SearchMetadata) => {
  const query = metadata.title;

  return query;
};
