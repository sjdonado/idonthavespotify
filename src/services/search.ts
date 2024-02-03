import { SPOTIFY_LINK_REGEX } from '~/config/constants';

import { logger } from '~/utils/logger';
import { getQueryFromMetadata } from '~/utils/query';

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
    logger.info(`[${spotifySearch.name}] loaded from cache: ${spotifyLink}`);

    return cache;
  }

  logger.info(`[${spotifySearch.name}] cache miss: ${spotifyLink}`);

  const { metadata, url } = await parseSpotifyMetadata(spotifyLink);

  const query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);

  logger.info(`[${spotifySearch.name}] url: ${url}, query: ${query}`);

  const [appleMusicLink, youtubeLink, deezerLink, tidalLink] = await Promise.all([
    getAppleMusicLink(query, metadata),
    getYouTubeLink(query, metadata),
    getDeezerLink(query, metadata),
    getTidalLink(query, metadata),
  ]);

  logger.info(
    `[${spotifySearch.name}] results: ${JSON.stringify({
      appleMusicLink,
      youtubeLink,
      deezerLink,
      tidalLink,
    })}`
  );

  const soundcloudLink = getSoundCloudLink(query);

  const links = [appleMusicLink, youtubeLink, deezerLink, tidalLink].filter(Boolean);

  // if at least one verified link is found, add to the rest
  if (links.length > 0) {
    links.push(soundcloudLink);
  }

  const spotifyContent: SpotifyContent = {
    id,
    type: metadata.type,
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    audio: metadata.audio,
    source: url,
    links: links as SpotifyContentLink[],
  };

  await Promise.all([incrementSearchCount(), cacheSpotifySearch(spotifyContent)]);

  return spotifyContent;
};
