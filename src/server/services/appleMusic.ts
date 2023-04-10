import { SpotifyContentLink, SpotifyContentLinkType, SpotifyMetadataType } from '~/@types/global';

import * as ENV from '~/config/env/server';

import { APPLE_MUSIC_LINK_SELECTOR } from '~/constants';

import { SpotifyMetadata } from '~/server/services/spotify';
import { responseMatchesQuery } from '~/utils/compare';

import { getQueryFromMetadata } from '~/utils/query';
import { getCheerioDoc } from '~/utils/scraper';

export async function getAppleMusicLink(
  metadata: SpotifyMetadata,
): Promise<SpotifyContentLink | undefined> {
  const query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);

  const url = `${ENV.services.appleMusic.baseUrl}${query}`;
  const html = await fetch(url).then((res) => res.text());
  const doc = getCheerioDoc(html);

  const appleMusicDataByType = {
    [SpotifyMetadataType.Song]: {
      href: doc(`div[aria-label="Songs"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().attr('href'),
      title: doc(`div[aria-label="Songs"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().text(),
      isVerified: true,
    },
    [SpotifyMetadataType.Album]: {
      href: doc(`div[aria-label="Albums"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().attr('href'),
      title: doc(`div[aria-label="Albums"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().text(),
      isVerified: true,
    },
    [SpotifyMetadataType.Playlist]: {
      href: doc(`div[aria-label="Playlists"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().attr('href'),
      title: doc(`div[aria-label="Playlists"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().text(),
      isVerified: true,
    },
    [SpotifyMetadataType.Artist]: {
      href: doc(`div[aria-label="Artists"] ${APPLE_MUSIC_LINK_SELECTOR}`).first().attr('href'),
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
