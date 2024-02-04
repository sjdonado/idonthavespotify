import * as config from '~/config/default';

export const API_ENDPOINT = 'http://localhost/api';
export const API_SEARCH_ENDPOINT = `${API_ENDPOINT}/search?v=1`;

export const cachedSpotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

export const cachedResponse = {
  id: '2KvHC9z14GSl4YpkNMX384',
  type: 'music.song',
  title: 'Do Not Disturb',
  description: 'Drake · Song · 2017',
  image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
  audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
  source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
  links: [
    {
      type: 'appleMusic',
      url: 'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237',
      isVerified: true,
    },
    {
      type: 'youTube',
      url: 'https://www.youtube.com/watch?v=zhY_0DoQCQs',
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
      url: 'https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake',
    },
  ],
};

export const getYouTubeSearchLink = (query: string, type: string) => {
  const params = new URLSearchParams({
    part: 'snippet',
    maxResults: '1',
    q: query,
    type: type,
    key: config.services.youTube.apiKey as string,
  });

  const url = new URL(`${config.services.youTube.apiUrl}/search`);
  url.search = params.toString();

  return url.toString();
};

export const getAppleMusicSearchLink = (query: string) => {
  const params = `?term=${encodeURIComponent(query)}`;

  const url = new URL(`${config.services.appleMusic.apiUrl}/search${params}`);
  url.search = params.toString();

  return url.toString();
};

export const getDeezerSearchLink = (query: string, type: string) => {
  const params = new URLSearchParams({
    q: query,
    limit: '1',
  });

  const url = new URL(`${config.services.deezer.apiUrl}/${type}`);
  url.search = params.toString();

  return url.toString();
};

export const getSoundCloudSearchLink = (query: string) => {
  const params = new URLSearchParams({
    q: query,
  });

  const url = new URL(`${config.services.soundCloud.baseUrl}/search`);
  url.search = params.toString();

  return url.toString();
};
