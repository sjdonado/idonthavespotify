export enum MetadataType {
  Song = 'music.song',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'profile',
  Podcast = 'music.episode',
  Show = 'website',
}

export interface Song {
  title: string;
  description: string;
  type: MetadataType;
  image: string;
  audio?: string;
  links: {
    youtube: string;
    appleMusic: string;
    tidal: string;
    soundcloud: string;
  }
}
