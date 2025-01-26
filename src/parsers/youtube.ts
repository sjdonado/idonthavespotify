import { MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import { SearchMetadata } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

interface YoutubeDataResponse {
  kind: string;
  etag: string;
  items: Array<{
    kind: string;
    etag: string;
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        url: string;
        width: string;
        height: string;
      };
    };
  }>;
}

const METADATA_TO_YOUTUBE_ENDPOINT = {
  [MetadataType.Song]: 'videos',
  [MetadataType.Album]: 'playlists',
  [MetadataType.Playlist]: 'playlists',
  [MetadataType.Artist]: 'channels',
  [MetadataType.Podcast]: 'videos',
  [MetadataType.Show]: 'playlists',
};

export const getYouTubeMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.YouTube);
  if (cached) {
    logger.info(`[YouTube] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    const parsed = parseYouTubeLink(link);
    if (!parsed) throw new Error('No resource ID found in the provided YouTube link');

    const { searchType, resourceId } = parsed;

    const params = new URLSearchParams({
      id: resourceId,
      part: 'snippet',
      safeSearch: 'none',
      key: ENV.adapters.youTube.apiKey,
    });

    const url = new URL(
      `${ENV.adapters.youTube.apiUrl}/${METADATA_TO_YOUTUBE_ENDPOINT[searchType]}`
    );
    url.search = params.toString();

    const response = await HttpClient.get<YoutubeDataResponse>(url.toString());
    const item = response?.items?.[0];
    if (!item) {
      throw new Error(
        `No items returned from YouTube API for ${searchType} ${resourceId}`
      );
    }

    const { snippet } = item;
    if (!snippet) {
      throw new Error(`No snippet found on item for ${searchType} ${resourceId}`);
    }

    const { title, description, thumbnails } = snippet;
    const image = thumbnails?.url;

    const metadata: SearchMetadata = {
      title,
      description,
      type: searchType,
      image,
    };

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

function parseYouTubeLink(link: string) {
  const url = new URL(link);

  if (url.searchParams.has('list')) {
    return {
      searchType: MetadataType.Playlist,
      resourceId: url.searchParams.get('list')!,
    };
  }

  if (url.searchParams.has('v')) {
    return {
      searchType: MetadataType.Song,
      resourceId: url.searchParams.get('v')!,
    };
  }

  if (url.pathname.includes('/channel/')) {
    const parts = url.pathname.split('/channel/');
    return {
      searchType: MetadataType.Artist,
      resourceId: parts[1]?.split('/')[0],
    };
  }
}
