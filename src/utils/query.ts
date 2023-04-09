import { SpotifyMetadataType } from '~/@types/global';

import { SpotifyMetadata } from '~/server/services/spotify';

export const getQueryFromMetadata = ({ title, description, type }: SpotifyMetadata) => {
  let query = title;

  if (type === SpotifyMetadataType.Song) {
    const [, artist] = description.match(/^([^·]+) · Song · \d+$/) ?? [];
    query = artist ? `${query} ${artist}` : query;
  }

  if (type === SpotifyMetadataType.Album) {
    const [, artist] = description.match(/^.*?\. (.+?) · Album · \d+ · \d+ songs\.$/) ?? [];

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
};
