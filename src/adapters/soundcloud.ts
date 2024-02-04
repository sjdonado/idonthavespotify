import { compareTwoStrings } from 'string-similarity';

import * as config from '~/config/default';
import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';

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

    const listElements = noscriptDoc('ul:nth-of-type(2) li:lt(3) h2 a');

    const bestScore = {
      href: '',
      score: 0,
    };

    listElements.each((i, element) => {
      const title = noscriptDoc(element).text().trim();
      const href = noscriptDoc(element).attr('href');
      const score = compareTwoStrings(title.toLowerCase(), query.toLowerCase());

      if (href && score > bestScore.score) {
        bestScore.href = href;
        bestScore.score = score;
      }
    });

    if (bestScore.score <= RESPONSE_COMPARE_MIN_SCORE) {
      throw new Error(`No results found: ${JSON.stringify(bestScore)}`);
    }

    return {
      type: SpotifyContentLinkType.SoundCloud,
      url: `${config.services.soundCloud.baseUrl}${bestScore.href}`,
      isVerified: true,
    } as SpotifyContentLink;
  } catch (err) {
    logger.error(`[SoundCloud] (${url}) ${err}`);
  }
}
