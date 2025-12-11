export enum StreamingService {
  Spotify = 'spotify',
  YouTube = 'youTube',
  AppleMusic = 'appleMusic',
  Deezer = 'deezer',
  SoundCloud = 'soundCloud',
  Tidal = 'tidal',
  Google = 'google',
  Qobuz = 'qobuz',
}

export enum Adapter {
  Spotify = StreamingService.Spotify,
  YouTube = StreamingService.YouTube,
  AppleMusic = StreamingService.AppleMusic,
  Deezer = StreamingService.Deezer,
  SoundCloud = StreamingService.SoundCloud,
  Tidal = StreamingService.Tidal,
  Qobuz = StreamingService.Qobuz,
}

export enum Parser {
  Spotify = StreamingService.Spotify,
  YouTube = StreamingService.YouTube,
  AppleMusic = StreamingService.AppleMusic,
  Deezer = StreamingService.Deezer,
  SoundCloud = StreamingService.SoundCloud,
  Tidal = StreamingService.Tidal,
  Google = StreamingService.Google,
  Qobuz = StreamingService.Qobuz,
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
