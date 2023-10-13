import { SPOTIFY_ID_REGEX } from '~/config/constants';

import { SpotifyMetadataType, parseSpotifyMetadata } from '~/parsers/spotify';

import { getAppleMusicLink } from '~/adapters/apple-music';
import { getYoutubeLink } from '~/adapters/youtube';
import { getDeezerLink } from '~/adapters/deezer';
import { getSoundCloudLink } from '~/adapters/soundcloud';

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

  const appleMusicLink = await getAppleMusicLink(metadata);
  const youtubeLink = await getYoutubeLink(metadata);
  const deezerLink = await getDeezerLink(metadata);

  const soundcloudLink = getSoundCloudLink(metadata);

  const links = [appleMusicLink, youtubeLink, deezerLink].filter(
    Boolean
  ) as SpotifyContentLink[];

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
    source: spotifyLink,
    links,
  };

  // await Promise.all([incrementSearchCount(), cacheSpotifyContent(spotifyContent)]);

  return spotifyContent;
};
