import axios from 'axios';

import * as config from '~/config/default';
import { getCheerioDoc } from '~/utils/scraper';
import { responseMatchesQuery } from '~/utils/compare';
import { getQueryFromMetadata } from '~/utils/query';

import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

export const APPLE_MUSIC_LINK_SELECTOR = 'a[href^="https://music.apple.com/"]';

export async function getAppleMusicLink(
  metadata: SpotifyMetadata
): Promise<SpotifyContentLink | undefined> {
  const query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);

  const url = `${config.services.appleMusic.baseUrl}${query}`;
  const { data: html } = await axios.get(url);
  const doc = getCheerioDoc(html);

  const appleMusicDataByType = {
    [SpotifyMetadataType.Song]: {
      href: doc(`div[aria-label="Songs"] ${APPLE_MUSIC_LINK_SELECTOR}`)
        .first()
        .attr('href'),
      title: doc(`div[aria-label="Songs"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().text(),
      isVerified: true,
    },
    [SpotifyMetadataType.Album]: {
      href: doc(`div[aria-label="Albums"] ${APPLE_MUSIC_LINK_SELECTOR}`)
        .first()
        .attr('href'),
      title: doc(`div[aria-label="Albums"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().text(),
      isVerified: true,
    },
    [SpotifyMetadataType.Playlist]: {
      href: doc(`div[aria-label="Playlists"] ${APPLE_MUSIC_LINK_SELECTOR}`)
        .first()
        .attr('href'),
      title: doc(`div[aria-label="Playlists"] ${APPLE_MUSIC_LINK_SELECTOR}`)
        .first()
        .text(),
      isVerified: true,
    },
    [SpotifyMetadataType.Artist]: {
      href: doc(`div[aria-label="Artists"] ${APPLE_MUSIC_LINK_SELECTOR}`)
        .first()
        .attr('href'),
      title: doc(`div[aria-label="Artists"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().text(),
      isVerified: true,
    },
    [SpotifyMetadataType.Podcast]: undefined,
    [SpotifyMetadataType.Show]: undefined,
  };

  const { title, href, isVerified } = appleMusicDataByType[metadata.type] ?? {};

  if (!responseMatchesQuery(title ?? '', query)) {
    return undefined;
  }

  return {
    type: SpotifyContentLinkType.AppleMusic,
    url: href ?? url,
    isVerified,
  };
}
