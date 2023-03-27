export enum SpotifyMetadataType {
  Song = 'music.song',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'profile',
  Podcast = 'music.episode',
  Show = 'website',
}

export interface SpotifyContent {
  title: string;
  description: string;
  type: SpotifyMetadataType;
  image: string;
  audio?: string;
  links: {
    youtube: string;
    appleMusic: string;
    tidal: string;
    soundcloud: string;
  }
}

export interface Error {
  message: string;
}
