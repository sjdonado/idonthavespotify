import { MetadataType } from '~/config/enum';

import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

import { SearchMetadata } from '~/services/search';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';

import { fetchSpotifyMetadata } from '~/adapters/spotify';

enum YoutubeMetadataType {
  Song = 'video.other',
  Album = 'album',
  Playlist = 'playlist',
  Artist = 'channel',
  Podcast = 'song',
  Show = 'website',
}

const YOUTUBE_METADATA_TO_METADATA_TYPE = {
  [YoutubeMetadataType.Song]: MetadataType.Song,
  [YoutubeMetadataType.Album]: MetadataType.Album,
  [YoutubeMetadataType.Playlist]: MetadataType.Playlist,
  [YoutubeMetadataType.Artist]: MetadataType.Artist,
  [YoutubeMetadataType.Podcast]: MetadataType.Podcast,
  [YoutubeMetadataType.Show]: MetadataType.Show,
};

export const getYouTubeMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id);
  if (cached) {
    logger.info(`[YouTube] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    const html = await fetchSpotifyMetadata(link);

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property') ?? '';
    const image = metaTagContent(doc, 'og:image', 'property');
    const type = metaTagContent(doc, 'og:type', 'property');

    if (!title || !type || !image) {
      throw new Error('Youtube metadata not found');
    }

    const parsedTitle = title?.replace('- YouTube Music', '').trim();

    const metadata = {
      id,
      title: parsedTitle,
      description,
      type: YOUTUBE_METADATA_TO_METADATA_TYPE[type as YoutubeMetadataType],
      image,
    } as SearchMetadata;

    await cacheSearchMetadata(id, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getYouTubeMetadata.name}] (${link}) ${err}`);
  }
};

export const getYouTubeQueryFromMetadata = (metadata: SearchMetadata) => {
  let query = metadata.title;

  if (metadata.type === MetadataType.Song) {
    const matches = metadata.description?.match(/(?:·|&)\s*([^·&℗]+)/g);
    const artists = [
      ...new Set(matches?.map(match => match.trim().replace(/^[·&]\s*/, '')) || []),
    ];
    query = matches ? `${query} ${artists[0]}` : query;
  }

  if (metadata.type === MetadataType.Album) {
    query = `${query} album`;
  }

  if (metadata.type === MetadataType.Playlist) {
    query = `${query} playlist`;
  }

  return query;
};
