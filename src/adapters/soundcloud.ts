import * as config from '~/config/default';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';
import { responseMatchesQuery } from '~/utils/compare';

import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';
import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';

export async function getSoundCloudLink(query: string, metadata: SpotifyMetadata) {
  if (metadata.type === SpotifyMetadataType.Show) {
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

    const firstResultEl = noscriptDoc('ul:nth-of-type(2) li:first-of-type h2 a');

    const title = firstResultEl.text().trim();
    const href = firstResultEl.attr('href');

    if (!title || !href) {
      throw new Error('No results found');
    }

    const isVerified = responseMatchesQuery(title, query);

    return {
      type: SpotifyContentLinkType.SoundCloud,
      url: isVerified ? `${config.services.soundCloud.baseUrl}${href}` : url.toString(),
      isVerified,
    } as SpotifyContentLink;
  } catch (err) {
    logger.error(`[SoundCloud] (${url}) ${err}`);
  }
}
