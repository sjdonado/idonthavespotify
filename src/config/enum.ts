export enum StreamingService {
  Spotify = 'spotify',
  YouTube = 'youTube',
  AppleMusic = 'appleMusic',
  Deezer = 'deezer',
  SoundCloud = 'soundCloud',
  Tidal = 'tidal',
}

export enum Adapter {
  Spotify = StreamingService.Spotify,
  YouTube = StreamingService.YouTube,
  AppleMusic = StreamingService.AppleMusic,
  Deezer = StreamingService.Deezer,
  SoundCloud = StreamingService.SoundCloud,
  Tidal = StreamingService.Tidal,
}

export enum Parser {
  Spotify = StreamingService.Spotify,
  YouTube = StreamingService.YouTube,
  AppleMusic = StreamingService.AppleMusic,
  Deezer = StreamingService.Deezer,
  SoundCloud = StreamingService.SoundCloud,
  Tidal = StreamingService.Tidal,
}

export type StreamingServiceType = Adapter & Parser;

export enum MetadataType {
  Song = 'song',
  Album = 'album',
  Playlist = 'playlist',
  Artist = 'artist',
  Podcast = 'podcast',
  Show = 'show',
}
