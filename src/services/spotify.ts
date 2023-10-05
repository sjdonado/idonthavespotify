import { getAppleMusicLink } from '~/adapters/apple-music';
import { SPOTIFY_ID_REGEX } from '~/config/constants';

import { SpotifyMetadataType, parseSpotifyMetadata } from '~/parsers/spotify';

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

export const getSpotifyContent = async (spotifyLink: string): Promise<SpotifyContent> => {
  const metadata = await parseSpotifyMetadata(spotifyLink);

  const id = (spotifyLink.match(SPOTIFY_ID_REGEX) ?? [])[0]!;

  const appleMusicLink = await getAppleMusicLink(metadata);

  const links = [appleMusicLink].filter(Boolean) as SpotifyContentLink[];

  // if at least one verified link is found, add to the rest
  // if (links.length > 0) {
  //   links.push(tidalLink, soundcloudLink);
  // }

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
