import { QOBUZ_LINK_REGEX } from '~/config/constants';
import { MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

enum QobuzMetadataType {
  Song = 'track',
  Album = 'album',
  Artist = 'artist',
}

type QobuzTrackResponse = {
  id: number;
  title: string;
  version?: string;
  performer: { id: number; name: string };
  album: {
    id: string;
    title: string;
    image: { large: string };
    artist: { name: string };
  };
};

type QobuzAlbumResponse = {
  id: string;
  title: string;
  version?: string;
  image: { large: string };
  artist: { name: string };
};

type QobuzArtistResponse = {
  id: number;
  name: string;
  image?: { large: string };
  picture?: string;
};

const metadataCleanersMap: Partial<
  Record<MetadataType, (metadata: SearchMetadata) => string>
> = {
  [MetadataType.Song]: cleanQobuzTrackMetadataForQuery,
  [MetadataType.Album]: cleanQobuzAlbumMetadataForQuery,
  [MetadataType.Artist]: cleanQobuzArtistMetadataForQuery,
};

export const getQobuzMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.Qobuz);
  if (cached) {
    logger.info(`[Qobuz] (${id}) metadata cache hit`);
    return cached;
  }

  try {
    let type = link.match(QOBUZ_LINK_REGEX)?.[3];
    if (!type) {
      throw new Error('Qobuz link unable to be parsed correctly');
    }
    if (type === 'interpreter') {
      type = 'artist';
    }

    const metadata = await fetchQobuzMetadataFromApi(id, type as QobuzMetadataType);

    await cacheSearchMetadata(id, Parser.Qobuz, metadata);

    return metadata;
  } catch (err) {
    throw new Error(`[${getQobuzMetadata.name}] (${link}) ${err}`);
  }
};

async function fetchQobuzMetadataFromApi(
  id: string,
  type: QobuzMetadataType
): Promise<SearchMetadata> {
  const apiUrl = ENV.adapters.qobuz.apiUrl;
  const appId = ENV.adapters.qobuz.appId;

  const params = new URLSearchParams({ app_id: appId });

  let url: string;
  switch (type) {
    case QobuzMetadataType.Song:
      params.set('track_id', id);
      url = `${apiUrl}/track/get?${params}`;
      break;
    case QobuzMetadataType.Album:
      params.set('album_id', id);
      url = `${apiUrl}/album/get?${params}`;
      break;
    case QobuzMetadataType.Artist:
      params.set('artist_id', id);
      url = `${apiUrl}/artist/get?${params}`;
      break;
  }

  logger.info(`[Qobuz] Fetching metadata from API: ${url}`);

  switch (type) {
    case QobuzMetadataType.Song: {
      const response = await HttpClient.get<QobuzTrackResponse>(url);
      const title = response.version
        ? `${response.title} (${response.version})`
        : response.title;
      return {
        title: `${title} ${response.performer.name}`,
        description: `${response.album.title} - ${response.album.artist.name}`,
        type: MetadataType.Song,
        image: response.album.image.large,
      };
    }
    case QobuzMetadataType.Album: {
      const response = await HttpClient.get<QobuzAlbumResponse>(url);
      const title = response.version
        ? `${response.title} (${response.version})`
        : response.title;
      return {
        title: `${title} ${response.artist.name}`,
        description: response.artist.name,
        type: MetadataType.Album,
        image: response.image.large,
      };
    }
    case QobuzMetadataType.Artist: {
      const response = await HttpClient.get<QobuzArtistResponse>(url);
      return {
        title: response.name,
        description: response.name,
        type: MetadataType.Artist,
        image: response.image?.large ?? response.picture,
      };
    }
  }
}

function cleanQobuzAlbumMetadataForQuery(metadata: SearchMetadata) {
  return metadata.title.replace(',', '');
}

function cleanQobuzArtistMetadataForQuery(metadata: SearchMetadata) {
  return metadata.title;
}

function cleanQobuzTrackMetadataForQuery(metadata: SearchMetadata) {
  return metadata.title;
}

export const getQobuzQueryFromMetadata = (metadata: SearchMetadata) => {
  const cleanFunction = metadataCleanersMap[metadata.type];
  const cleaned = cleanFunction ? cleanFunction(metadata) : metadata.title;

  return cleaned.replace(/\s+/g, ' ').trim();
};
