import { MetadataType, Parser } from '~/config/enum';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';
import type { SearchMetadata } from '~/services/search';
import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

enum BandcampMetadataType {
  Song = 'song',
  Album = 'album',
  Artist = 'band',
}

const BANDCAMP_METADATA_TO_METADATA_TYPE = {
  [BandcampMetadataType.Song]: MetadataType.Song,
  [BandcampMetadataType.Album]: MetadataType.Album,
  [BandcampMetadataType.Artist]: MetadataType.Artist,
};

export const getBandcampMetadata = async (id: string, link: string) => {
  // Bandcamp doesn't have IDs, but does have nicely structured URLs
  // Our regex matches the artist subdomain, which is the most we can find in the URL on an Artist search
  // But since the artist subdomain exists on Album and Track URLs also, we can't use it as the ID
  // So we'll use the full link as our ID for the cache searches
  const cached = await getCachedSearchMetadata(link, Parser.Bandcamp);
  if (cached) {
    logger.info(`[Bandcamp] (${link}) metadata cache hit`);
    return cached;
  }

  try {
    const html = await fetchMetadata(link);

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property');
    const type = metaTagContent(doc, 'og:type', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');

    if (!title || !type || !image) {
      throw new Error('Bandcamp metadata not found');
    }

    const parsedTitle = title?.trim();

    const metadata = {
      id,
      title: parsedTitle,
      description,
      type: BANDCAMP_METADATA_TO_METADATA_TYPE[type as BandcampMetadataType],
      image,
    } as SearchMetadata;

    // make sure we key the cache on the full link per the note above
    await cacheSearchMetadata(link, Parser.Bandcamp, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getBandcampMetadata.name}] (${link}) ${err}`);
  }
};

export const getBandcampQueryFromMetadata = (metadata: SearchMetadata) => {
  let query = metadata.title;

  if (metadata.type === MetadataType.Album || metadata.type === MetadataType.Song) {
    // ${album}, by ${artist}
    // ${track}, by ${artist}
    query = query.replace(/,\sby\s.+$/, '');
  }

  return query;
};
