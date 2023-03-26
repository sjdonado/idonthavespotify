import { MetadataType } from '~/@types/global';

import { SpotifyMetadata } from '~/server/services/spotify';

export const getQueryFromMetadata = ({ title, description, type }: SpotifyMetadata) => {
  let query = title;

  if (type === MetadataType.Song) {
    const [, artist] = description.match(/^([^·]+) · Song · \d+$/) ?? [];
    query = artist ? `${query} ${artist}` : query;
  }

  if (type === MetadataType.Album) {
    const [, artist] = description.match(/^.*?\. (.+?) · Album · \d+ · \d+ songs\.$/) ?? [];

    query = artist ? `${query} ${artist}` : query;
  }

  if (type === MetadataType.Playlist) {
    query = `${query.replace(/This is /, '')} Playlist`;
  }

  if (type === MetadataType.Podcast) {
    const [, artist] = description.match(/from (.+?) on Spotify\./) ?? [];

    query = artist ? `${query} ${artist}` : query;
  }

  return encodeURIComponent(query);
};
