import { MetadataType } from '~/config/enum';

import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

import { SearchMetadata } from '~/services/search';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';

import { fetchSpotifyMetadata } from '~/adapters/spotify';

enum SpotifyMetadataType {
  Song = 'music.song',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'profile',
  Podcast = 'music.episode',
  Show = 'website',
}

const SPOTIFY_METADATA_TO_METADATA_TYPE = {
  [SpotifyMetadataType.Song]: MetadataType.Song,
  [SpotifyMetadataType.Album]: MetadataType.Album,
  [SpotifyMetadataType.Playlist]: MetadataType.Playlist,
  [SpotifyMetadataType.Artist]: MetadataType.Artist,
  [SpotifyMetadataType.Podcast]: MetadataType.Podcast,
  [SpotifyMetadataType.Show]: MetadataType.Show,
};

export const getSpotifyMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id);
  if (cached) {
    logger.info(`[Spotify] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    const html = await fetchSpotifyMetadata(link);

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property')?.trim();
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');
    const audio = metaTagContent(doc, 'og:audio', 'property');

    const type = link.includes('episode')
      ? SpotifyMetadataType.Podcast
      : (metaTagContent(doc, 'og:type', 'property') as SpotifyMetadataType);

    if (!title || !description || !type || !image) {
      throw new Error('Spotify metadata not found');
    }

    const metadata = {
      id,
      title,
      description,
      type: SPOTIFY_METADATA_TO_METADATA_TYPE[type],
      image,
      audio,
    } as SearchMetadata;

    await cacheSearchMetadata(id, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getSpotifyMetadata.name}] (${link}) ${err}`);
  }
};

export const getSpotifyQueryFromMetadata = (metadata: SearchMetadata) => {
  const parsedTitle = metadata.title
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu,
      ''
    )
    .trim();

  let query = parsedTitle;

  if (metadata.type === MetadataType.Song) {
    const [, artist] = metadata.description.match(/^([^·]+) · Song · \d+$/) ?? [];
    query = artist ? `${query} ${artist}` : query;
  }

  if (metadata.type === MetadataType.Album) {
    const [, artist] = metadata.description.match(/(.+?) · Album ·/) ?? [];

    query = artist ? `${query} ${artist}` : query;
  }

  if (metadata.type === MetadataType.Playlist) {
    query = `${query.replace(/This is /, '')} Playlist`;
  }

  if (metadata.type === MetadataType.Podcast) {
    const [, artist] = metadata.description.match(/from (.+?) on Spotify\./) ?? [];

    query = artist ? `${query} ${artist}` : query;
  }

  return query;
};
