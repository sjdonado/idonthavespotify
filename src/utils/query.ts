import { SpotifyMetadataType } from '~/parsers/spotify';

export function getQueryFromMetadata(
  title: string,
  description: string,
  type: SpotifyMetadataType
) {
  const parsedTitle = title
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu,
      ''
    )
    .trim();

  let query = parsedTitle;

  if (type === SpotifyMetadataType.Song) {
    const [, artist] = description.match(/^([^·]+) · Song · \d+$/) ?? [];
    query = artist ? `${query} ${artist}` : query;
  }

  if (type === SpotifyMetadataType.Album) {
    const [, artist] = description.match(/(.+?) · Album ·/) ?? [];

    query = artist ? `${query} ${artist}` : query;
  }

  if (type === SpotifyMetadataType.Playlist) {
    query = `${query.replace(/This is /, '')} Playlist`;
  }

  if (type === SpotifyMetadataType.Podcast) {
    const [, artist] = description.match(/from (.+?) on Spotify\./) ?? [];

    query = artist ? `${query} ${artist}` : query;
  }

  return query;
}
