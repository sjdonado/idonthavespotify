import { SPOTIFY_LINK_REGEX } from '~/config/constants';

import { logger } from '~/utils/logger';
import { getQueryFromMetadata } from '~/utils/query';

import {
  SpotifyMetadata,
  SpotifyMetadataType,
  parseSpotifyMetadata,
} from '~/parsers/spotify';

import { cacheSpotifySearch, getSpotifySearchFromCache } from './cache';

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

  // const cache = await getSpotifySearchFromCache(id);
  // if (cache) {
  //   logger.info(`[${spotifySearch.name}] loaded from cache: ${spotifyLink}`);
  //
  //   return cache;
  // }
  //
  // logger.info(`[${spotifySearch.name}] cache miss: ${spotifyLink}`);

  // const { metadata, url } = await parseSpotifyMetadata(spotifyLink);

  const { metadata, url } = {
    metadata: {
      title: 'MONACO',
      description: 'Bad Bunny · Song · 2023',
      type: 'music.song',
      image: 'https://i.scdn.co/image/ab67616d0000b2737b1fc51ff3257b5286a1ecec',
      audio: 'https://p.scdn.co/mp3-preview/f80c7cc394457fc77cd6668a715b039fd86404f9',
    },
    url: 'https://open.spotify.com/track/4MjDJD8cW7iVeWInc2Bdyj?si=ba37d559d8564363   ',
  } as { metadata: SpotifyMetadata; url: string };

  const query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);

  logger.info(`[${spotifySearch.name}] url: ${url}, query: ${query}`);

  const [appleMusicLink, youtubeLink, deezerLink, soundCloudLink] = await Promise.all([
    // getAppleMusicLink(query, metadata),
    Promise.resolve(),
    getYouTubeLink(query, metadata),
    Promise.resolve(),
    Promise.resolve(),
    // getDeezerLink(query, metadata),
    // getSoundCloudLink(query, metadata),
  ]);

  logger.info(
    `[${spotifySearch.name}] results: ${JSON.stringify({
      appleMusicLink,
      youtubeLink,
      deezerLink,
      soundCloudLink,
    })}`
  );

  const tidalLink = getTidalLink(query);

  const links = [appleMusicLink, youtubeLink, deezerLink, soundCloudLink].filter(Boolean);

  // add no-verified links if at least one link is verified
  if (links.some(link => link?.isVerified)) {
    links.push(tidalLink);
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

  cacheSpotifySearch(spotifyContent);

  return spotifyContent;
};
