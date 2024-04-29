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

export const getYouTubeMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id);
  if (cached) {
    return cached;
  }

  try {
    const html = await fetchSpotifyMetadata(link);

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');
    const type = metaTagContent(doc, 'og:type', 'property');

    if (!title || !description || !type || !image) {
      throw new Error('Youtube metadata not found');
    }

    const parsedTitle = title?.replace('- YouTube Music', '').trim();

    const metadata = {
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

    query = matches ? `${query} ${artists}` : query;
  }

  // TODO: extract artist from description depending on the metadata structure
  // if (metadata.type === MetadataType.Album) {
  //   query = artist ? `${query} ${artist}` : query;
  // }
  //
  // if (metadata.type === MetadataType.Playlist) {
  //   query = album ? `${query} ${album}` : query;
  // }
  //
  // if (metadata.type === MetadataType.Podcast) {
  //   query = artist ? `${query} ${artist}` : query;
  // }

  return query;
};
