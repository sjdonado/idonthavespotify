export enum SpotifyMetadataType {
  Song = 'music.song',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'profile',
  Podcast = 'music.episode',
  Show = 'website',
}

export enum SpotifyContentLinkType {
  Youtube = 'youtube',
  AppleMusic = 'appleMusic',
  Tidal = 'tidal',
  SoundCloud = 'soundCloud',
}

export interface SpotifyContentLink {
  type: SpotifyContentLinkType;
  url: string;
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
