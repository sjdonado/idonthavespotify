import { MetadataType, Parser } from '~/config/enum';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';
import { SearchMetadata } from '~/services/search';
import { logger } from '~/utils/logger';
import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

enum YouTubeMetadataType {
  Song = 'video.other',
  Album = 'album',
  Playlist = 'playlist',
  Artist = 'channel',
  Podcast = 'song',
  Show = 'website',
}

const YOUTUBE_METADATA_TO_METADATA_TYPE = {
  [YouTubeMetadataType.Song]: MetadataType.Song,
  [YouTubeMetadataType.Album]: MetadataType.Album,
  [YouTubeMetadataType.Playlist]: MetadataType.Playlist,
  [YouTubeMetadataType.Artist]: MetadataType.Artist,
  [YouTubeMetadataType.Podcast]: MetadataType.Podcast,
  [YouTubeMetadataType.Show]: MetadataType.Show,
};
export const getYouTubeMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.YouTube);
  if (cached) {
    logger.info(`[YouTube] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    const html = await fetchMetadata(link, {});

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property') ?? '';
    const image = metaTagContent(doc, 'og:image', 'property');
    const type = metaTagContent(doc, 'og:type', 'property');

    if (!title || !type || !image) {
      throw new Error('YouTube metadata not found');
    }

    const parsedTitle = title
      ?.replace(/-?\s*on\sApple\sMusic/i, '')
      .replace(/-?\s*YouTube\sMusic/i, '')
      .trim();

    const metadata = {
      id,
      title: parsedTitle,
      description,
      type: YOUTUBE_METADATA_TO_METADATA_TYPE[type as YouTubeMetadataType],
      image,
    } as SearchMetadata;

    await cacheSearchMetadata(id, Parser.YouTube, metadata);

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
