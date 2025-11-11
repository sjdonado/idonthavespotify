import axios from 'axios';

import { MetadataType, Parser } from '~/config/enum';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';
import { logger } from '~/utils/logger';

async function extractQueryFromGoogleLink(
  googleLink: string
): Promise<{ query: string; type: MetadataType }> {
  try {
    // Follow redirects to get to the final Google search URL
    // share.google links redirect to google.com/search
    logger.info(`[Google] Following redirects for: ${googleLink}`);

    const response = await axios.get(googleLink, {
      maxRedirects: 10,
      validateStatus: () => true,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const finalUrl = response.request?.res?.responseUrl || response.config.url;
    logger.info(`[Google] Final URL: ${finalUrl}`);

    const urlObj = new URL(finalUrl);
    const query = urlObj.searchParams.get('q');
    const ibp = urlObj.searchParams.get('ibp');

    if (!query) {
      throw new Error(`No query parameter found in Google URL: ${finalUrl}`);
    }

    let type = MetadataType.Song;

    if (ibp === 'playlist') {
      type = MetadataType.Album;
    } else if (ibp === 'channel') {
      type = MetadataType.Artist;
    }

    logger.info(`[Google] Extracted query: "${query}", type: ${type}`);

    return { query, type };
  } catch (error) {
    logger.error(`[Google] Error extracting query: ${error}`);
    throw new Error(`Failed to extract query from Google link: ${error}`);
  }
}

export const getGoogleMetadata = async (id: string, source: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.Google);
  if (cached) {
    logger.info(`[Google] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    logger.info(`[Google] Processing Google link: ${source}`);

    const { query, type } = await extractQueryFromGoogleLink(source);

    const metadata: SearchMetadata = {
      title: query,
      description: '',
      type,
    };

    await cacheSearchMetadata(id, Parser.Google, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getGoogleMetadata.name}] (${source}) ${err}`);
  }
};

export const getGoogleQueryFromMetadata = (metadata: SearchMetadata) => {
  // The query from Google is already in a good format for searching
  const query = metadata.title.replace(/\s+/g, ' ').trim();

  logger.info(`[Google] Final search query: "${query}"`);
  return query;
};
