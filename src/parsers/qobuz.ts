import { MetadataType, Parser } from '~/config/enum';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { ENV } from '~/config/env';
import { QOBUZ_LINK_REGEX } from '~/config/constants';
import { fetchMetadata } from '~/services/metadata';
import type { SearchMetadata } from '~/services/search';
import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

enum QobuzMetadataType {
  // Tracks aren't parseable without switching to the private API,
  // so the regex in `constants.ts` purposefully won't match it
  Song = 'track',
  Album = 'album',
  Artist = 'artist',
}

const QOBUZ_METADATA_TO_METADATA_TYPE = {
  [QobuzMetadataType.Song]: MetadataType.Song,
  [QobuzMetadataType.Album]: MetadataType.Album,
  [QobuzMetadataType.Artist]: MetadataType.Artist,
};

const metadataCleanersMap = {
  [MetadataType.Song]: cleanQobuzTrackMetadataForQuery,
  [MetadataType.Album]: cleanQobuzAlbumMetadataForQuery,
  [MetadataType.Artist]: cleanQobuzArtistMetadataForQuery,
 };

export const getQobuzMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.Qobuz);
  if (cached) {
    logger.info(`[Qobuz] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    let type = link.match(QOBUZ_LINK_REGEX)?.[3];
    if (!type) {
      throw new Error('Qobuz link unable to be parsed correctly');
    }
    if (type === 'interpreter'){ type = 'artist';}

    // `play.qobuz.com` pages require a login, so there's nothing to scrape...
    if (link.match(QOBUZ_LINK_REGEX)?.[1] === 'play') {
      // ...but we can convert the link easily enough to something we *can* scrape
      link = `${ENV.adapters.qobuz.storeUrl}/${type}/${id}`; // this will expand with a redirect
      logger.info(`[Qobuz] Switching 'play' link to: ${link}`);
    }

    const html = await fetchMetadata(link);

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');

    if (!title) {
      throw new Error('Qobuz metadata not found');
    }

    const metadata = {
      id,
      title: title?.trim(),
      description: description?.trim(),
      type: QOBUZ_METADATA_TO_METADATA_TYPE[type as QobuzMetadataType],
      image,
    } as SearchMetadata;

    await cacheSearchMetadata(id, Parser.Qobuz, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getQobuzMetadata.name}] (${link}) ${err}`);
  }
};

function cleanQobuzAlbumMetadataForQuery(metadata: SearchMetadata) {
  return metadata.title
    // Remove comma, but leave Artist in place
    // NOTE: this will remove more commas than the one we're technically targeting,
    //       but that shouldn't have any negative effects on the string matching
    //       (especially if we also remove commas in the `adapters` comparison)
    .replace(',','');
}

function cleanQobuzArtistMetadataForQuery(metadata: SearchMetadata) {
  /*
  ${Artist} Discography - Download Albums in Hi-Res - Qobuz
  ${Artist} Discografía - Descarga de álbumes en Hi-Res - Qobuz
  ${Artist} Discografia - Scarica gli album in Hi-Res - Qobuz
  ${Artist}-Diskographie - Alben in Hi-Res herunterladen - Qobuz
  Discographie de ${Artist} - Téléchargez des albums en Hi-Res - Qobuz
  Discografia de ${Artist} - Baixar álbuns em Hi-Res - Qobuz
  */
  return metadata.title
    .replace(/^(Discographie|Discografia)\sde\s/, '')
    // Accented characters regex from here: https://stackoverflow.com/a/26900132
    .replace(/(Discography|Discografía|Discografia|-Diskographie)(\s-\s[A-Za-zÀ-ÖØ-öø-ÿ\s\-]+)-\sQobuz$/,'');
}

function cleanQobuzTrackMetadataForQuery(metadata: SearchMetadata) {
  return metadata.title;
}

export const getQobuzQueryFromMetadata = (metadata: SearchMetadata) => {
  // TODO: Help! Typescript is confusing me.
  // const cleanFunction = metadataCleanersMap[metadata.type];

  const cleanFunction = metadata.type === 'album' ? cleanQobuzAlbumMetadataForQuery : (metadata.type === 'artist' ? cleanQobuzArtistMetadataForQuery : null);

  const cleaned = typeof cleanFunction === 'function' ? cleanFunction(metadata) : metadata.title;

  return cleaned
    // Remove suffix added to the title
    .replace(/\s\-\sQobuz$/, '')
    // Clean extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};
