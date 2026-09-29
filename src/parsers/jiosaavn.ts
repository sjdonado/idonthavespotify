import { JIOSAAVN_LINK_REGEX } from '~/config/constants';
import { MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getServiceGuard } from '~/utils/service-guard';

enum JiosaavnLinkKind {
  Song = 'song',
  Album = 'album',
  Artist = 'artist',
  Featured = 'featured',
  Playlist = 'playlist',
}

type JiosaavnSongDetails = {
  song?: string;
  album?: string;
  primary_artists?: string;
  image?: string;
  media_preview_url?: string;
};

type JiosaavnAlbumDetails = {
  title?: string;
  primary_artists?: string;
  image?: string;
};

type JiosaavnArtistDetails = {
  name?: string;
  image?: string;
};

type JiosaavnPlaylistDetails = {
  listname?: string;
  image?: string;
};

export const getJiosaavnMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.Jiosaavn);
  if (cached) {
    logger.info(`[Jiosaavn] (${id}) metadata cache hit`);
    return cached;
  }

  const guard = getServiceGuard('jiosaavn');
  if (!guard.acquire()) {
    throw new Error('[Jiosaavn] service temporarily unavailable');
  }

  try {
    const kind = link.match(JIOSAAVN_LINK_REGEX)?.[1];
    if (!kind) {
      throw new Error('Jiosaavn link unable to be parsed correctly');
    }

    const metadata = await fetchJiosaavnMetadataFromApi(id, kind);
    guard.recordSuccess();

    await cacheSearchMetadata(id, Parser.Jiosaavn, metadata);

    return metadata;
  } catch (err) {
    guard.recordFailure();
    throw new Error(`[${getJiosaavnMetadata.name}] (${link}) ${err}`);
  }
};

async function fetchJiosaavnMetadataFromApi(
  id: string,
  kind: string
): Promise<SearchMetadata> {
  const params = new URLSearchParams({
    __call: 'webapi.get',
    token: id,
    type:
      kind === JiosaavnLinkKind.Featured
        ? JiosaavnLinkKind.Playlist
        : kind,
    cc: 'in',
    _marker: '0',
    _format: 'json',
  });
  const url = `${ENV.adapters.jiosaavn.apiUrl}/api.php?${params}`;

  logger.info(`[Jiosaavn] Fetching metadata from API: ${url}`);

  // webapi.get serves application/json, but sibling search endpoints
  // on this host serve JSON as text/html, so parse defensively.
  const raw = await HttpClient.get<Record<string, unknown> | string>(url);
  const response =
    typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : raw;
  const flat =
    typeof response['song'] === 'string' ||
    typeof response['title'] === 'string' ||
    typeof response['name'] === 'string' ||
    typeof response['listname'] === 'string';
  const rawDetails = flat ? response : Object.values(response)[0];
  if (!rawDetails || typeof rawDetails !== 'object') {
    throw new Error('Jiosaavn details came back empty');
  }
  const details = rawDetails as
    | JiosaavnSongDetails
    | JiosaavnAlbumDetails
    | JiosaavnArtistDetails
    | JiosaavnPlaylistDetails;

  switch (kind) {
    case JiosaavnLinkKind.Song: {
      const song = details as JiosaavnSongDetails;
      if (!song.song) throw new Error('Song details missing title');
      return {
        title: `${song.song} ${song.primary_artists ?? ''}`.trim(),
        description: song.album ?? '',
        type: MetadataType.Song,
        image: song.image,
        audio: song.media_preview_url,
      };
    }
    case JiosaavnLinkKind.Album: {
      const album = details as JiosaavnAlbumDetails;
      if (!album.title) throw new Error('Album details missing title');
      return {
        title: `${album.title} ${album.primary_artists ?? ''}`.trim(),
        description: album.primary_artists ?? '',
        type: MetadataType.Album,
        image: album.image,
      };
    }
    case JiosaavnLinkKind.Artist: {
      const artist = details as JiosaavnArtistDetails;
      if (!artist.name) throw new Error('Artist details missing name');
      return {
        title: artist.name,
        description: artist.name,
        type: MetadataType.Artist,
        image: artist.image,
      };
    }
    case JiosaavnLinkKind.Featured:
    case JiosaavnLinkKind.Playlist: {
      const playlist = details as JiosaavnPlaylistDetails;
      if (!playlist.listname) throw new Error('Playlist details missing name');
      return {
        title: playlist.listname,
        description: playlist.listname,
        type: MetadataType.Playlist,
        image: playlist.image,
      };
    }
    default:
      throw new Error(`Unsupported Jiosaavn link kind: ${kind}`);
  }
}

export const getJiosaavnQueryFromMetadata = (metadata: SearchMetadata) =>
  metadata.title.replace(/\s+/g, ' ').trim();
