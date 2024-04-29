import { MetadataType } from '~/config/enum';
import { fetchSpotifyMetadata } from '~/adapters/spotify';

import { getCheerioDoc, metaTagContent } from '~/utils/scraper';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { SearchMetadata } from '~/services/search';

enum YoutubeMetadataType {
  Song = 'video.other',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'profile',
  Podcast = 'music.episode',
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

export const getYouTubeMetadata = async (link: string) => {
  // const cached = await getCachedSearchMetadata(link);
  // if (cached) {
  //   return cached;
  // }

  try {
    const html = await fetchSpotifyMetadata(link);

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');
    const type = metaTagContent(doc, 'og:type', 'property') as YoutubeMetadataType;

    console.log({ title, description, image, type });
    if (!title || !description || !type || !image) {
      throw new Error('Youtube metadata not found');
    }

    const metadata = {
      title,
      description,
      type: YOUTUBE_METADATA_TO_METADATA_TYPE[type],
      image,
    } as SearchMetadata;

    // await cacheSearchMetadata(link, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getYouTubeMetadata.name}] (${link}) ${err}`);
  }
};

export const getYouTubeQueryFromMetadata = (metadata: SearchMetadata) => {
  const parsedTitle = metadata.title?.replace('- YouTube Music', '').trim();
  const [, artist, album] = metadata.description?.match(/· ([^·]+) ([^·]+) ℗/) ?? [];

  let query = parsedTitle;

  if (metadata.type === MetadataType.Song) {
    query = artist ? `${query} ${artist}` : query;
  }

  if (metadata.type === MetadataType.Album) {
    query = artist ? `${query} ${artist}` : query;
  }

  if (metadata.type === MetadataType.Playlist) {
    query = album ? `${query} ${album}` : query;
  }

  if (metadata.type === MetadataType.Podcast) {
    query = artist ? `${query} ${artist}` : query;
  }

  return query;
};
