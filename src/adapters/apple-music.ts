import { compareTwoStrings } from 'string-similarity';

import * as config from '~/config/default';
import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';

import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

export const APPLE_MUSIC_LINK_SELECTOR = 'a[href^="https://music.apple.com/"]';

const APPLE_MUSIC_SEARCH_TYPES = {
  [SpotifyMetadataType.Song]: 'Songs',
  [SpotifyMetadataType.Album]: 'Albums',
  [SpotifyMetadataType.Playlist]: 'Playlists',
  [SpotifyMetadataType.Artist]: 'Artists',
  [SpotifyMetadataType.Podcast]: undefined,
  [SpotifyMetadataType.Show]: undefined,
};

export async function getAppleMusicLink(query: string, metadata: SpotifyMetadata) {
  const searchType = APPLE_MUSIC_SEARCH_TYPES[metadata.type];

  if (!searchType) {
    return;
  }

  // apple music does not support x-www-form-urlencoded encoding
  const params = `term=${encodeURIComponent(query)}`;

  const url = new URL(`${config.services.appleMusic.apiUrl}/search?${params}`);

  try {
    const html = await HttpClient.get<string>(url.toString());
    const doc = getCheerioDoc(html);

    const listElements = doc(
      `div[aria-label="${searchType}"] a[href^="https://music.apple.com/"]:lt(3)`
    );

    const bestScore = {
      href: '',
      score: 0,
    };

    listElements.each((i, element) => {
      const title = doc(element).text().trim();
      const href = doc(element).attr('href');
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
      type: SpotifyContentLinkType.AppleMusic,
      url: bestScore.href,
      isVerified: true,
    } as SpotifyContentLink;
  } catch (err) {
    logger.error(`[Apple Music](${url}) ${err} `);
  }
}
