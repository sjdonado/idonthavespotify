import {
  beforeAll,
  afterEach,
  afterAll,
  describe,
  expect,
  it,
  spyOn,
  jest,
} from 'bun:test';

import axios from 'axios';
import Redis from 'ioredis';
import AxiosMockAdapter from 'axios-mock-adapter';

import * as config from '~/config/default';

import youtubeSongResponseMock from '../fixtures/song/youtubeResponseMock.json';
import youtubeAlbumResponseMock from '../fixtures/album/youtubeResponseMock.json';
import youtubePlaylistResponseMock from '../fixtures/playlist/youtubeResponseMock.json';
import youtubeArtistResponseMock from '../fixtures/artist/youtubeResponseMock.json';
import youtubePodcastResponseMock from '../fixtures/podcast/youtubeResponseMock.json';
import youtubeShowResponseMock from '../fixtures/show/youtubeResponseMock.json';
import youtubeExclusiveContentResponseMock from '../fixtures/spotify-exclusive/youtubeResponseMock.json';

import deezerSongResponseMock from '../fixtures/song/deezerResponseMock.json';
import deezerAlbumResponseMock from '../fixtures/album/deezerResponseMock.json';
import deezerPlaylistResponseMock from '../fixtures/playlist/deezerResponseMock.json';
import deezerArtistResponseMock from '../fixtures/artist/deezerResponseMock.json';
import deezerPodcastResponseMock from '../fixtures/podcast/deezerResponseMock.json';
import deezerShowResponseMock from '../fixtures/show/deezerResponseMock.json';
import deezerExclusiveContentResponseMock from '../fixtures/spotify-exclusive/deezerResponseMock.json';

import { app } from '~/index';

const API_ENDPOINT = 'http://localhost/api';

const [
  spotifySongHeadResponseMock,
  spotifyAlbumHeadResponseMock,
  spotifyPlaylistHeadResponseMock,
  spotifyArtistHeadResponseMock,
  spotifyPodcastHeadResponseMock,
  spotifyShowHeadResponseMock,
  spotifyExclusiveContentHeadResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/song/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/album/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/playlist/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/artist/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/podcast/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/show/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/spotify-exclusive/spotifyHeadResponseMock.html').text(),
]);

const [
  appleMusicSongResponseMock,
  appleMusicAlbumResponseMock,
  appleMusicPlaylistResponseMock,
  appleMusicArtistResponseMock,
  appleMusicPodcastResponseMock,
  appleMusicShowResponseMock,
  appleMusicExclusiveContentResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/song/appleMusicResponseMock.html').text(),
  Bun.file('tests/fixtures/album/appleMusicResponseMock.html').text(),
  Bun.file('tests/fixtures/playlist/appleMusicResponseMock.html').text(),
  Bun.file('tests/fixtures/artist/appleMusicResponseMock.html').text(),
  Bun.file('tests/fixtures/podcast/appleMusicResponseMock.html').text(),
  Bun.file('tests/fixtures/show/appleMusicResponseMock.html').text(),
  Bun.file('tests/fixtures/spotify-exclusive/appleMusicResponseMock.html').text(),
]);

describe('Api router', () => {
  let mock: AxiosMockAdapter;
  let redisSetMock: jest.Mock;
  let redisGetMock: jest.Mock;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);

    redisSetMock = spyOn(Redis.prototype, 'set');
    redisGetMock = spyOn(Redis.prototype, 'get');
  });

  afterEach(() => {
    redisGetMock.mockReset();
    redisSetMock.mockReset();
  });

  afterAll(() => {
    mock.restore();
  });

  describe('GET /search', () => {
    const endpoint = `${API_ENDPOINT}/search`;

    const cachedSpotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

    const cachedResponse = {
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
          url: 'https://soundcloud.com/search/sounds?q=Do%20Not%20Disturb%20Drake',
        },
        {
          type: 'tidal',
          url: 'https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake',
        },
      ],
    };

    it('should return 200 - Song', async () => {
      const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do%20Not%20Disturb%20Drake';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youTube.apiSearchUrl}${query}&type=video&key=${config.services.youTube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/track?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicSongResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeSongResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerSongResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '2KvHC9z14GSl4YpkNMX384',
        type: 'music.song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: spotifyLink,
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
            url: 'https://soundcloud.com/search/sounds?q=Do%20Not%20Disturb%20Drake',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 - Album', async () => {
      const spotifyLink = 'https://open.spotify.com/album/4czdORdCWP9umpbhFXK2fW';
      const query = 'For%20All%20The%20Dogs%20Drake';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youTube.apiSearchUrl}${query}&type=playlist&key=${config.services.youTube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/album?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyAlbumHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicAlbumResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeAlbumResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerAlbumResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '4czdORdCWP9umpbhFXK2fW',
        type: 'music.album',
        title: 'For All The Dogs',
        description: 'Drake · Album · 2023 · 23 songs.',
        image: 'https://i.scdn.co/image/ab67616d0000b2730062621987df634efede0e6c',
        source: 'https://open.spotify.com/album/4czdORdCWP9umpbhFXK2fW',
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/us/album/for-all-the-dogs/1710685602',
            isVerified: true,
          },
          {
            type: 'youTube',
            url: 'https://www.youtube.com/playlist?list=PLF4zOU-_1sldqZIv8UEvE2ChFHLkkneT1',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/album/496789121',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/search/sounds?q=For%20All%20The%20Dogs%20Drake',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=For%20All%20The%20Dogs%20Drake',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 - Playlist', async () => {
      const spotifyLink = 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ';
      const query = 'This%20Is%20Bad%20Bunny%20Playlist';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youTube.apiSearchUrl}${query}&type=playlist&key=${config.services.youTube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/playlist?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyPlaylistHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicPlaylistResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubePlaylistResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerPlaylistResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '37i9dQZF1DX2apWzyECwyZ',
        type: 'music.playlist',
        title: 'This Is Bad Bunny',
        description: 'This Is Bad Bunny · Playlist · 109 songs · 5.2M likes',
        image: 'https://i.scdn.co/image/ab67706f000000029c0eb2fdff534f803ea018e1',
        source: 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ',
        links: [
          {
            type: 'youTube',
            url: 'https://www.youtube.com/playlist?list=PLIqoag_AY7ykvJKLrUzfvX7pXS-YMIDfR',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/playlist/3370896142',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/search/sounds?q=This%20Is%20Bad%20Bunny%20Playlist',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=This%20Is%20Bad%20Bunny%20Playlist',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 - Artist', async () => {
      const spotifyLink = 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5';
      const query = 'J.%20Cole';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youTube.apiSearchUrl}${query}%20official&type=channel&key=${config.services.youTube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/artist?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyArtistHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicArtistResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeArtistResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerArtistResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '6l3HvQ5sa6mXTsMTB19rO5',
        type: 'profile',
        title: 'J. Cole',
        description: 'Artist · 45.1M monthly listeners.',
        image: 'https://i.scdn.co/image/ab6761610000e5ebadd503b411a712e277895c8a',
        source: 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5',
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/us/artist/j-cole/73705833',
            isVerified: true,
          },
          {
            type: 'youTube',
            url: 'https://www.youtube.com/channel/UCnc6db-y3IU7CkT_yeVXdVg',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/artist/339209',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/search/sounds?q=J.%20Cole',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=J.%20Cole',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 - Podcast Episode', async () => {
      const spotifyLink = 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT';
      const query =
        'The%20End%20of%20Twitter%20as%20We%20Know%20It%20Waveform%3A%20The%20MKBHD%20Podcast';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youTube.apiSearchUrl}${query}&type=video&key=${config.services.youTube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyPodcastHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicPodcastResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubePodcastResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerPodcastResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '43TCrgmP23qkLcAXZQN8qT',
        type: 'music.episode',
        title: 'The End of Twitter as We Know It',
        description:
          'Listen to this episode from Waveform: The MKBHD Podcast on Spotify. So much happened this week! Not only did Twitter get renamed but Samsung Unpacked happened as well. First, Marques, Andrew, and David talk about base model pricing before talking all about Twitter getting renamed to X. Then they give their first impressions on the new Samsung products before we close it out with some trivia and tech show-and-tell too. Enjoy!  Links: Linus Base Models video: https://bit.ly/lttstartingprice Apple Insider Action Button article: https://bit.ly/appleinsiderrumors Lex Friedman interview with Zuck: https://bit.ly/lexvsmark  Shop products mentioned:  Google Pixel Fold at https://geni.us/zhOE5oh  Samsung Galaxy Z Fold 5 at https://geni.us/ofBYJ6J  Samsung Galaxy Z Flip 5 at https://geni.us/X7vim  Samsung Galaxy Tab S9 at https://geni.us/bBm1  Samsung Galaxy Watch 6 at https://geni.us/gOAk  Shop the merch: https://shop.mkbhd.com  Threads: Waveform: https://www.threads.net/@waveformpodcast Marques: https://www.threads.net/@mkbhd Andrew: https://www.threads.net/@andrew_manganelli David Imel: https://www.threads.net/@davidimel Adam: https:https://www.threads.net/@parmesanpapi17 Ellis: https://twitter.com/EllisRovin  Twitter: https://twitter.com/WVFRM  TikTok:  https://www.tiktok.com/@waveformpodcast  Join the Discord: https://discord.gg/mkbhd  Music by 20syl: https://bit.ly/2S53xlC  Waveform is part of the Vox Media Podcast Network. Learn more about your ad choices. Visit podcastchoices.com/adchoices',
        image: 'https://i.scdn.co/image/ab6765630000ba8aa05ac56dbc44378f45ef693a',
        audio:
          'https://podz-content.spotifycdn.com/audio/clips/0Dijh26Vc2UoFrsXfkACQ8/clip_2900584_2965529.mp3',
        source: 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT',
        links: [
          {
            type: 'youTube',
            url: 'https://www.youtube.com/watch?v=0atwuUWhKWs',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/search/sounds?q=The%20End%20of%20Twitter%20as%20We%20Know%20It%20Waveform%3A%20The%20MKBHD%20Podcast',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=The%20End%20of%20Twitter%20as%20We%20Know%20It%20Waveform%3A%20The%20MKBHD%20Podcast',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 - Podcast Show', async () => {
      const spotifyLink = 'https://open.spotify.com/show/6o81QuW22s5m2nfcXWjucc';
      const query = 'Waveform%3A%20The%20MKBHD%20Podcast';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youTube.apiSearchUrl}${query}&type=channel&key=${config.services.youTube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/podcast?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyShowHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicShowResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeShowResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerShowResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '6o81QuW22s5m2nfcXWjucc',
        type: 'website',
        title: 'Waveform: The MKBHD Podcast',
        description:
          'Listen to Waveform: The MKBHD Podcast on Spotify. A tech podcast for the gadget lovers and tech heads among us from the mind of Marques Brownlee, better known as MKBHD. MKBHD has made a name for himself on YouTube reviewing everything from the newest smartphones to cameras to electric cars. Pulling from over 10 years of experience covering the tech industry, MKBHD and co-hosts Andrew Manganelli and David Imel will keep you informed and entertained as they take a deep dive into the latest and greatest in tech and what deserves your hard earned cash. New episodes every week. Waveform is part of the Vox Media Podcast Network. We wanna make the podcast even better, help us learn how we can: https://bit.ly/2EcYbu4 ',
        image: 'https://i.scdn.co/image/ab6765630000ba8aa05ac56dbc44378f45ef693a',
        source: 'https://open.spotify.com/show/6o81QuW22s5m2nfcXWjucc',
        links: [
          {
            type: 'youTube',
            url: 'https://www.youtube.com/channel/UCEcrRXW3oEYfUctetZTAWLw',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/show/1437252',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/search/sounds?q=Waveform%3A%20The%20MKBHD%20Podcast',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=Waveform%3A%20The%20MKBHD%20Podcast',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 - Spotify Exclusive Content', async () => {
      const spotifyLink = 'https://open.spotify.com/show/7LuQv400JFzzlJrOuMukRj';
      const query = 'The%20Louis%20Theroux%20Podcast';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youTube.apiSearchUrl}${query}&type=channel&key=${config.services.youTube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/podcast?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyExclusiveContentHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicExclusiveContentResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeExclusiveContentResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerExclusiveContentResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '7LuQv400JFzzlJrOuMukRj',
        type: 'website',
        title: 'The Louis Theroux Podcast',
        description:
          'Listen to The Louis Theroux Podcast on Spotify. Join Louis Theroux as he embarks on a series of in-depth and freewheeling conversations with a curated collection of fascinating figures from across the globe. The Louis Theroux Podcast is a Spotify Exclusive podcast from Mindhouse.',
        image: 'https://i.scdn.co/image/ab6765630000ba8a9f6908102653db4d1d168c59',
        source: 'https://open.spotify.com/show/7LuQv400JFzzlJrOuMukRj',
        links: [],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 from cache', async () => {
      const request = new Request(`${endpoint}?spotifyLink=${cachedSpotifyLink}`);

      redisGetMock.mockResolvedValueOnce(JSON.stringify(cachedResponse));
      redisGetMock.mockResolvedValue(1);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual(cachedResponse);

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisGetMock.mock.calls).toEqual([
        ['idonthavespotify:cache::2KvHC9z14GSl4YpkNMX384'],
        ['idonthavespotify:searchCount'],
      ]);
      expect(redisSetMock).toHaveBeenCalledTimes(1);
    });

    it('should return 200 from cache and increase search count', async () => {
      const request = new Request(`${endpoint}?spotifyLink=${cachedSpotifyLink}`);
      const searchCount = 2;

      redisGetMock.mockResolvedValueOnce(JSON.stringify(cachedResponse));
      redisGetMock.mockResolvedValue(searchCount);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual(cachedResponse);

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisGetMock.mock.calls).toEqual([
        ['idonthavespotify:cache::2KvHC9z14GSl4YpkNMX384'],
        ['idonthavespotify:searchCount'],
      ]);
      expect(redisSetMock).toHaveBeenCalledTimes(1);
      expect(redisSetMock.mock.calls).toEqual([
        ['idonthavespotify:searchCount', `${searchCount + 1}`],
      ]);
    });

    it('should return 200 when adapter returns error - YouTube', async () => {
      const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do%20Not%20Disturb%20Drake';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youTube.apiSearchUrl}${query}&type=video&key=${config.services.youTube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/track?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicSongResponseMock);
      mock.onGet(youtubeQuery).reply(400, {
        error: {
          errors: [
            {
              domain: 'youtube.parameter',
              reason: 'invalidValue',
              message: "Invalid value for parameter 'videoId'",
            },
          ],
          code: 400,
          message: "Invalid value for parameter 'videoId'",
        },
      });
      mock.onGet(deezerQuery).reply(200, deezerSongResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'UNKNOWN',
        message: '[YouTube] Error: Request failed with status code 400',
      });

      expect(redisGetMock).toHaveBeenCalledTimes(1);
      expect(redisSetMock).toHaveBeenCalledTimes(0);
    });

    it('should return 200 when adapter returns error - Deezer', async () => {
      const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do%20Not%20Disturb%20Drake';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youTube.apiSearchUrl}${query}&type=video&key=${config.services.youTube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/track?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicSongResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeSongResponseMock);
      mock.onGet(deezerQuery).reply(500);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'UNKNOWN',
        message: '[Deezer] Error: Request failed with status code 500',
      });

      expect(redisGetMock).toHaveBeenCalledTimes(1);
      expect(redisSetMock).toHaveBeenCalledTimes(0);
    });

    it('should return bad request - invalid spotifyLink', async () => {
      const spotifyLink = 'https://open.spotify.com/invalid';

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Invalid spotify link',
      });
    });

    it('should return bad request - unknown query param', async () => {
      const request = new Request(`${endpoint}?foo=bar`);
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Invalid spotify link',
      });
    });
  });
});
