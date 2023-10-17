import { SPOTIFY_ID_REGEX } from '~/config/constants';

import { SpotifyMetadataType, parseSpotifyMetadata } from '~/parsers/spotify';

import { cacheSpotifySearch, getSpotifySearchFromCache } from './cache';
import { incrementSearchCount } from './statistics';

import { getAppleMusicLink } from '~/adapters/apple-music';
import { getYoutubeLink } from '~/adapters/youtube';
import { getDeezerLink } from '~/adapters/deezer';
import { getSoundCloudLink } from '~/adapters/soundcloud';
import { getTidalLink } from '~/adapters/tidal';

export enum SpotifyContentLinkType {
  Youtube = 'youtube',
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
  const metadata = await parseSpotifyMetadata(spotifyLink);

  const id = (spotifyLink.match(SPOTIFY_ID_REGEX) ?? [])[0]!;

  const cache = await getSpotifySearchFromCache(id);
  if (cache) {
    await incrementSearchCount();
    return cache;
  }

  const [appleMusicLink, youtubeLink, deezerLink] = await Promise.all([
    getAppleMusicLink(metadata),
    getYoutubeLink(metadata),
    getDeezerLink(metadata),
  ]);

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
    source: spotifyLink,
    links,
  };

  await Promise.all([incrementSearchCount(), cacheSpotifySearch(spotifyContent)]);

  return spotifyContent;
};
