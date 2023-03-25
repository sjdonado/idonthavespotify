import { MetadataType, SpotifyMetadata } from '~/server/spotify';

export const getQueryFromMetadata = ({ title, description, type }: SpotifyMetadata) => {
  let query = title;

  if (type === MetadataType.Song) {
    const [, artist] = description.match(/^([^·]+) · Song · \d+$/) ?? [];

    if (artist) {
      query += ` ${artist}`;
    }
  }

  if (type === MetadataType.Album) {
    const [, artist] = description.match(/^.*?\. (.+?) · Album · \d+ · \d+ songs\.$/) ?? [];

    if (artist) {
      query += ` ${artist}`;
    }
  }

  return encodeURIComponent(query);
};