import { TIDAL_SEARCH_TYPES } from '~/adapters/tidal';
import { YOUTUBE_SEARCH_TYPES } from '~/adapters/youtube';
import { MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';

export const apiSearchEndpoint = (baseUrl: URL) => `${baseUrl}api/search?v=1`;

export const pageSearchEndpoint = (baseUrl: URL) => `${baseUrl}search`;

export const urlShortenerLink = ENV.services.urlShortener.apiUrl;
export const urlShortenerResponseMock = {
  data: {
    id: '6ce3f2d6-d73c-4c7f-b622-3b30e34d70dd',
    refer: 'http://localhost:4000/2saYhYg',
    origin:
      'http://localhost:3000/?id=b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
    clicks: [],
  },
};

export const cachedSpotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

export const cachedResponse = {
  id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
  type: 'song',
  title: 'Do Not Disturb',
  description: 'Drake · Song · 2017',
  image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
  audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
  source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
  universalLink: urlShortenerResponseMock.data.refer,
  links: [
    {
      type: 'appleMusic',
      url: 'https://geo.music.apple.com/de/album/do-not-disturb/1440890708?i=1440892237&app=music&ls=1',
      isVerified: true,
    },
    {
      type: 'deezer',
      url: 'https://www.deezer.com/track/144572248',
      isVerified: true,
    },
    {
      type: 'soundCloud',
      url: 'https://soundcloud.com/octobersveryown/drake-do-not-disturb',
      isVerified: true,
    },
    {
      type: 'tidal',
      url: 'https://tidal.com/browse/track/71717750',
      isVerified: true,
    },
    {
      type: 'youTube',
      url: 'https://music.youtube.com/watch?v=vVd4T5NxLgI',
      isVerified: true,
    },
  ],
};

export const getYouTubeSearchLink = (query: string, type: MetadataType) => {
  const searchType = YOUTUBE_SEARCH_TYPES[type]!;

  const params = new URLSearchParams({
    type: searchType,
    regionCode: 'US',
    q: query,
    part: 'id',
    safeSearch: 'none',
    key: ENV.adapters.youTube.apiKey,
  });

  const url = new URL(ENV.adapters.youTube.apiUrl);
  url.search = params.toString();

  return url.toString();
};

export const getAppleMusicSearchLink = (query: string) => {
  const params = `?term=${encodeURIComponent(query)}`;

  const url = new URL(`${ENV.adapters.appleMusic.apiUrl}/search${params}`);
  url.search = params.toString();

  return url.toString();
};

export const getDeezerSearchLink = (query: string, type: string) => {
  const params = new URLSearchParams({
    q: query,
    limit: '4',
  });

  const url = new URL(`${ENV.adapters.deezer.apiUrl}/${type}`);
  url.search = params.toString();

  return url.toString();
};

export const getSoundCloudSearchLink = (query: string) => {
  const params = new URLSearchParams({
    q: query,
  });

  const url = new URL(`${ENV.adapters.soundCloud.baseUrl}/search`);
  url.search = params.toString();

  return url.toString();
};

export const getTidalSearchLink = (query: string, type: MetadataType) => {
  const searchType = TIDAL_SEARCH_TYPES[type]!;

  const params = new URLSearchParams({
    countryCode: 'US',
    include: searchType,
  });

  const url = new URL(
    `${ENV.adapters.tidal.apiUrl}/${encodeURIComponent(query)}/relationships/${searchType}`
  );
  url.search = params.toString();

  return url.toString();
};
