import { PANDORA_LINK_REGEX } from '~/config/constants';
import { MetadataType, Parser } from '~/config/enum';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';
import type { SearchMetadata } from '~/services/search';
import { logger } from '~/utils/logger';
import { getCheerioDoc, linkedDataScript, metaTagContent } from '~/utils/scraper';

enum PandoraMetadataType {
  Song = 'TR',
  Album = 'AL',
  Artist = 'AR',
  Podcast = 'PE',
  Show = 'PC',
}

const PANDORA_METADATA_TO_METADATA_TYPE = {
  [PandoraMetadataType.Song]: MetadataType.Song,
  [PandoraMetadataType.Album]: MetadataType.Album,
  [PandoraMetadataType.Artist]: MetadataType.Artist,
  [PandoraMetadataType.Podcast]: MetadataType.Podcast,
  [PandoraMetadataType.Show]: MetadataType.Show,
};

export const getPandoraMetadata = async (id: string, link: string) => {
  // Pandora's IDs are predictable and prefixed with their type: ${two-letter-type}:${actual-id}
  // For some URLs (Podcasts and Shows), the captured ID from the URL is correct/not transformed
  // For Albums, Tracks, and Artists, the ID is hashed and I haven't been able to identify it....
  // e.g.: ALcdVpX6J57q54q (URL) -> AL:49608296 (actual)

  const cached = await getCachedSearchMetadata(id, Parser.Pandora);
  if (cached) {
    logger.info(`[Pandora] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    const type = id.slice(0, 2);

    const html = await fetchMetadata(link);

    const doc = getCheerioDoc(html);

    let title, description, image;

    // Pandora's codebase must be such a rat's nest...
    if (['AL', 'AR', 'TR'].indexOf(type) !== -1) {
      // === Music Page ===

      // There's a helpfully quite complete JSON Linked Data script node right at the top of the page,
      // And it's *much* more straightforward for getting some of our structured data than regexing the og tags
      const atts = linkedDataScript(doc);

      // Free up a handful of bytes of memory
      delete atts.potentialAction;

      // Debug
      // logger.info(JSON.stringify(atts, null, 2));

      // Instead of fussing with the ID from the URL and checking whether it's hashed or not
      // Just grab a known-good one from our linked data
      id = atts['@id'];

      title = atts.name;
      image = atts.image;

      // There is no `og:description` tag and `twitter:description` tags are inconsistently available
      // (and not populated with different info most of the time anyway)
      // So we're just going to use the `description` field to bake in the Artist for the eventual query
      description =
        'byArtist' in atts && 'name' in atts.byArtist
          ? [title, atts.byArtist.name].join(' ')
          : title;
    } else if (['PC', 'PE'].indexOf(type) !== -1) {
      // === Podcast Page ===

      // The Linked Data node is present, but empty for podcast links :|

      // This `title` tag will be the name of the Podcast on the main Podcast page (good)
      // ...and also still the name of the Podcast on any individual Episode page (very bad)
      title = metaTagContent(doc, 'og:title', 'property');
      image = metaTagContent(doc, 'og:image', 'property');

      // Podcasts seem to have even fewer meta tags for some reason
      description = `Listen to the ${title} podcast on Pandora.`;

      // The Episode title can be scraped from the HTML of the page layout: `[data-qa="header_static_text_title"]`
      // But it doesn't exist cleanly in any tag or script anywhere in the document's HEAD
      // So our only options are to pull it from the HTML or accept the slugified version from the URL
      if (type === 'PE') {
        const ep_title = link
          .match(PANDORA_LINK_REGEX)?.[2]
          .replace(/[^\w]/g, ' ')
          .trim();

        title = [ep_title, title].join(' ');
      }
    } else {
      throw new Error('Unknown Pandora type (or malformed ID).');
    }

    if (!title || !image) {
      throw new Error('Pandora metadata not found');
    }

    const parsedTitle = title?.trim();

    const metadata = {
      id,
      title: parsedTitle,
      description,
      type: PANDORA_METADATA_TO_METADATA_TYPE[type as PandoraMetadataType],
      image,
    } as SearchMetadata;

    await cacheSearchMetadata(id, Parser.Pandora, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getPandoraMetadata.name}] (${link}) ${err}`);
  }
};

export const getPandoraQueryFromMetadata = (metadata: SearchMetadata) => {
  let query = metadata.title;

  if (metadata.type === MetadataType.Album || metadata.type === MetadataType.Song) {
    query = metadata.description;
  }

  return query;
};
