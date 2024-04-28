import * as config from '~/config/default';
import { MetadataType, ServiceType } from '~/config/enum';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';
import { getResultWithBestScore } from '~/utils/compare';

import { SearchMetadata, SearchResultLink } from '~/services/search';

export async function getSoundCloudLink(query: string, metadata: SearchMetadata) {
  if (metadata.type === MetadataType.Show) {
    return;
  }

  const params = new URLSearchParams({
    q: query,
  });

  const url = new URL(`${config.services.soundCloud.baseUrl}/search`);
  url.search = params.toString();

  try {
    const html = await HttpClient.get<string>(url.toString());
    const doc = getCheerioDoc(html);

    // Extract contents of noscript
    const noscriptHTML = doc('noscript').eq(1).html();
    const noscriptDoc = getCheerioDoc(noscriptHTML ?? '');

    const listElements = noscriptDoc('ul:nth-of-type(2) li:lt(3) h2 a');

    const { href } = getResultWithBestScore(noscriptDoc, listElements, query);

    return {
      type: ServiceType.SoundCloud,
      url: `${config.services.soundCloud.baseUrl}${href}`,
      isVerified: true,
    } as SearchResultLink;
  } catch (err) {
    logger.error(`[SoundCloud] (${url}) ${err}`);
  }
}
