import {
  APPLE_MUSIC_LINK_REGEX,
  DEEZER_LINK_REGEX,
  SOUNDCLOUD_LINK_REGEX,
  SPOTIFY_LINK_REGEX,
  TIDAL_LINK_REGEX,
  YOUTUBE_LINK_REGEX,
} from '~/config/constants';
import { Parser } from '~/config/enum';
import { getSourceFromId } from '~/utils/encoding';
import { logger } from '~/utils/logger';

export type SearchParser = {
  id: string;
  type: Parser;
  source: string;
};

export const getSearchParser = (link?: string, searchId?: string) => {
  const decodedSource = searchId ? getSourceFromId(searchId) : undefined;

  let source = link;

  if (searchId && decodedSource) {
    logger.info(
      `[${getSearchParser.name}] (${searchId}) source decoded: ${decodedSource}`
    );
    source = decodedSource;
  }

  if (!source) {
    throw new Error('Source not found');
  }

  let id, type;

  const spotifyId = source.match(SPOTIFY_LINK_REGEX)?.[3];
  if (spotifyId) {
    id = spotifyId;
    type = Parser.Spotify;
  }

  const youtubeId = source.match(YOUTUBE_LINK_REGEX)?.[1];
  if (youtubeId) {
    id = youtubeId;
    type = Parser.YouTube;
  }

  const appleMusicMatch = source.match(APPLE_MUSIC_LINK_REGEX);
  const appleMusicId = appleMusicMatch
    ? appleMusicMatch[3] || appleMusicMatch[2] || appleMusicMatch[1]
    : null;
  if (appleMusicId) {
    id = appleMusicId;
    type = Parser.AppleMusic;
  }

  const deezerId = source.match(DEEZER_LINK_REGEX)?.[1];
  if (deezerId) {
    id = deezerId;
    type = Parser.Deezer;
  }

  const soundCloudMatch = source.match(SOUNDCLOUD_LINK_REGEX);
  const soundCloudId = soundCloudMatch ? soundCloudMatch[3] || soundCloudMatch[2] : null;
  if (soundCloudId) {
    id = soundCloudId;
    type = Parser.SoundCloud;
  }

  const tidalId = source.match(TIDAL_LINK_REGEX)?.[2];
  if (tidalId) {
    id = tidalId;
    type = Parser.Tidal;
  }

  if (!id || !type) {
    throw new Error('Service id could not be extracted from source.');
  }

  const parsedSource = new URL(source);

  const searchParser = {
    id,
    type,
    source: [parsedSource.origin, parsedSource.pathname].join(''),
  } as SearchParser;

  return searchParser;
};
