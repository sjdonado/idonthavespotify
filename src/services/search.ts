import { SPOTIFY_LINK_REGEX } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

import { SpotifyMetadataType, parseSpotifyMetadata } from '~/parsers/spotify';

import { cacheSpotifySearch, getSpotifySearchFromCache } from './cache';
import { incrementSearchCount } from './statistics';

import { getAppleMusicLink } from '~/adapters/apple-music';
import { getYouTubeLink } from '~/adapters/youtube';
import { getDeezerLink } from '~/adapters/deezer';
import { getSoundCloudLink } from '~/adapters/soundcloud';
import { getTidalLink } from '~/adapters/tidal';
export enum SpotifyContentLinkType {
  YouTube = 'youTube',
  AppleMusic = 'appleMusic',
  Tidal = 'tidal',
  SoundCloud = 'soundCloud',
  Deezer = 'deezer',
}

export interface SpotifyContentLink {
  type: SpotifyContentLinkType;
  url: string;
  isVerified?: boolean;
}

export interface SpotifyContent {
  id: string;
  type: SpotifyMetadataType;
  title: string;
  description: string;
  image: string;
  audio?: string;
  source: string;
  links: SpotifyContentLink[];
}

export const spotifySearch = async (spotifyLink: string): Promise<SpotifyContent> => {
  const id = spotifyLink.match(SPOTIFY_LINK_REGEX)?.[3] ?? '';

  const cache = await getSpotifySearchFromCache(id);
  if (cache) {
    await incrementSearchCount();
    logger.info(`Found in cache: ${spotifyLink}`);
    return cache;
  }
  logger.info(`Not found in cache: ${spotifyLink}`);

  const httpClient = new HttpClient();

  const { metadata, url } = await parseSpotifyMetadata(httpClient, spotifyLink);

  logger.info(`Fetching links: ${url}`);
  const [appleMusicLink, youtubeLink, deezerLink] = await Promise.all([
    getAppleMusicLink(httpClient, metadata),
    getYouTubeLink(httpClient, metadata),
    getDeezerLink(httpClient, metadata),
  ]);

  logger.info(
    `Search results:
      appleMusic: ${appleMusicLink !== undefined},
      youtube: ${youtubeLink !== undefined},
      deezer: ${deezerLink! !== undefined}`
  );

  const soundcloudLink = getSoundCloudLink(metadata);
  const tidalLink = getTidalLink(metadata);

  const links = [appleMusicLink, youtubeLink, deezerLink].filter(
    Boolean
  ) as SpotifyContentLink[];

  // if at least one verified link is found, add to the rest
  if (links.length > 0) {
    links.push(soundcloudLink, tidalLink);
  }

  const spotifyContent: SpotifyContent = {
    id,
    type: metadata.type,
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    audio: metadata.audio,
    source: url,
    links,
  };

  await Promise.all([incrementSearchCount(), cacheSpotifySearch(spotifyContent)]);

  return spotifyContent;
};
