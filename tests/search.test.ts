import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import type { Server } from 'bun';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  spyOn,
} from 'bun:test';

import { ENV } from '~/config/env';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import { loadHeadSnapshots, loadSearchSnapshots } from './mocks/snapshots';
import { createTestApp, nodeFetch } from './utils/request';
import {
  apiSearchEndpoint,
  getSoundCloudSearchLink,
  urlShortenerLink,
  urlShortenerResponseMock,
} from './utils/shared';

const headSnapshots = loadHeadSnapshots();
const searchSnapshots = loadSearchSnapshots();

describe('GET /search', () => {
  let app: Server<undefined>;
  let searchEndpointUrl: string;

  let axiosMock: InstanceType<typeof AxiosMockAdapter>;
  let getUniversalMetadataFromTidalMock: Mock<
    typeof tidalUniversalLinkParser.getUniversalMetadataFromTidal
  >;

  beforeAll(() => {
    app = createTestApp();
    searchEndpointUrl = apiSearchEndpoint(app.url);

    axiosMock = new AxiosMockAdapter(axios);
    getUniversalMetadataFromTidalMock = spyOn(
      tidalUniversalLinkParser,
      'getUniversalMetadataFromTidal'
    );
  });

  afterAll(() => {
    app.stop();
    cacheStore.reset();
    axiosMock.reset();
    getUniversalMetadataFromTidalMock.mockReset();
  });

  beforeEach(() => {
    cacheStore.reset();
    axiosMock.reset();

    getUniversalMetadataFromTidalMock.mockResolvedValue(undefined);
    axiosMock.onPost(ENV.adapters.spotify.authUrl).reply(200, {});
    axiosMock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
    axiosMock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);
  });

  afterEach(() => {
    axiosMock.reset();
  });

  describe('GET /search - Song', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc';
      const query = 'Like a Rolling Stone Bob Dylan';

      // Mock Spotify metadata API
      axiosMock
        .onGet('https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc')
        .reply(200, headSnapshots.spotifyTrackRollingStone);

      // Mock adapter API calls
      axiosMock
        .onGet(/music\.apple\.com.*search/)
        .reply(200, searchSnapshots.appleMusicRollingStone);

      axiosMock
        .onGet(/api\.deezer\.com.*search.*track/)
        .reply(200, JSON.parse(searchSnapshots.deezerRollingStone));

      const soundCloudSearchUrl = getSoundCloudSearchLink(query);
      axiosMock
        .onGet(soundCloudSearchUrl)
        .reply(200, searchSnapshots.soundCloudRollingStone);

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);
      axiosMock.onGet(/youtube\.googleapis\.com/).reply(200, { items: [] });

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8zQWhYWmE4c1VRaHQwVUVkQkpncEdj',
        type: 'song',
        title: 'Like a Rolling Stone',
        description: 'Bob Dylan · Highway 61 Revisited · Song · 1965',
        image: 'https://i.scdn.co/image/ab67616d0000b2730cb0884829c5503b2e242541',
        audio: 'https://p.scdn.co/mp3-preview/62c229b1cadd22b991df9aeaedd38e873ddaccbe',
        source: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            notAvailable: false,
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
          },
          {
            isVerified: true,
            notAvailable: false,
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
          },
          {
            isVerified: true,
            notAvailable: false,
            type: 'soundCloud',
            url: 'https://soundcloud.com/bobdylan/like-a-rolling-stone-1',
          },
          {
            isVerified: true,
            type: 'spotify',
            url: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
          },
        ],
      });

      expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(0);
    });

    it('should return 200 - Mobile link', async () => {
      const mobileSpotifyLink = 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc';
      const query = 'Like a Rolling Stone Bob Dylan';

      // Mock Spotify metadata API
      axiosMock
        .onGet(/open\.spotify\.com\/track\/3AhXZa8sUQht0UEdBJgpGc/)
        .reply(200, headSnapshots.spotifyTrackRollingStone);

      // Mock adapter API calls
      axiosMock
        .onGet(/music\.apple\.com.*search/)
        .reply(200, searchSnapshots.appleMusicRollingStone);

      axiosMock
        .onGet(/api\.deezer\.com.*search.*track/)
        .reply(200, JSON.parse(searchSnapshots.deezerRollingStone));

      const soundCloudSearchUrl = getSoundCloudSearchLink(query);
      axiosMock
        .onGet(soundCloudSearchUrl)
        .reply(200, searchSnapshots.soundCloudRollingStone);

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link: mobileSpotifyLink }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8zQWhYWmE4c1VRaHQwVUVkQkpncEdj',
        type: 'song',
        title: 'Like a Rolling Stone',
        description: 'Bob Dylan · Highway 61 Revisited · Song · 1965',
        image: 'https://i.scdn.co/image/ab67616d0000b2730cb0884829c5503b2e242541',
        audio: 'https://p.scdn.co/mp3-preview/62c229b1cadd22b991df9aeaedd38e873ddaccbe',
        source: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
            isVerified: true,
            notAvailable: false,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
            isVerified: true,
            notAvailable: false,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/bobdylan/like-a-rolling-stone-1',
            isVerified: true,
            notAvailable: false,
          },
          {
            type: 'spotify',
            url: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
            isVerified: true,
          },
        ],
      });

      expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(0);
    });

    it('should return 200 - Extra query params', async () => {
      const link =
        'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=NbEEVPZvTVuov_nA3ylJJQ&utm_source=copy-link&utm_medium=copy-link&context=spotify%3Aalbum%3A4czdORdCWP9umpbhFXK2aW&_branch_match_id=1238568162599463760&_branch_referrer=H2sIAAAAAAAAA8soKSkottLXLy7IL8lMq9TLyczL1q%2Fy8nHxLLXwM3RJAgDKC3LnIAAAAA%3D%3D';
      const query = 'Like a Rolling Stone Bob Dylan';

      // Mock Spotify metadata API
      axiosMock
        .onGet(/open\.spotify\.com\/track\/3AhXZa8sUQht0UEdBJgpGc/)
        .reply(200, headSnapshots.spotifyTrackRollingStone);

      // Mock adapter API calls
      axiosMock
        .onGet(/music\.apple\.com.*search/)
        .reply(200, searchSnapshots.appleMusicRollingStone);

      axiosMock
        .onGet(/api\.deezer\.com.*search.*track/)
        .reply(200, JSON.parse(searchSnapshots.deezerRollingStone));

      const soundCloudSearchUrl = getSoundCloudSearchLink(query);
      axiosMock
        .onGet(soundCloudSearchUrl)
        .reply(200, searchSnapshots.soundCloudRollingStone);

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8zQWhYWmE4c1VRaHQwVUVkQkpncEdjP3NpPU5iRUVWUFp2VFZ1b3ZfbkEzeWxKSlE',
        type: 'song',
        title: 'Like a Rolling Stone',
        description: 'Bob Dylan · Highway 61 Revisited · Song · 1965',
        image: 'https://i.scdn.co/image/ab67616d0000b2730cb0884829c5503b2e242541',
        audio: 'https://p.scdn.co/mp3-preview/62c229b1cadd22b991df9aeaedd38e873ddaccbe',
        source:
          'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=NbEEVPZvTVuov_nA3ylJJQ&utm_source=copy-link&utm_medium=copy-link&context=spotify%3Aalbum%3A4czdORdCWP9umpbhFXK2aW&_branch_match_id=1238568162599463760&_branch_referrer=H2sIAAAAAAAAA8soKSkottLXLy7IL8lMq9TLyczL1q%2Fy8nHxLLXwM3RJAgDKC3LnIAAAAA%3D%3D',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
            isVerified: true,
            notAvailable: false,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
            isVerified: true,
            notAvailable: false,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/bobdylan/like-a-rolling-stone-1',
            isVerified: true,
            notAvailable: false,
          },
          {
            type: 'spotify',
            url: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=NbEEVPZvTVuov_nA3ylJJQ&utm_source=copy-link&utm_medium=copy-link&context=spotify%3Aalbum%3A4czdORdCWP9umpbhFXK2aW&_branch_match_id=1238568162599463760&_branch_referrer=H2sIAAAAAAAAA8soKSkottLXLy7IL8lMq9TLyczL1q%2Fy8nHxLLXwM3RJAgDKC3LnIAAAAA%3D%3D',
            isVerified: true,
          },
        ],
      });

      expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(0);
    });
  });

  describe('GET /search - Album', () => {
    const link = 'https://open.spotify.com/album/7dqftJ3kas6D0VAdmt3k3V';

    it('should return 200', async () => {
      // Mock Spotify metadata API
      axiosMock
        .onGet(/open\.spotify\.com\/album\/7dqftJ3kas6D0VAdmt3k3V/)
        .reply(200, headSnapshots.spotifyAlbumStories);

      // Mock adapter API calls
      axiosMock
        .onGet(/music\.apple\.com.*search/)
        .reply(200, searchSnapshots.appleMusicStories);

      axiosMock
        .onGet(/api\.deezer\.com.*search.*album/)
        .reply(200, JSON.parse(searchSnapshots.deezerStories));

      const soundCloudSearchUrl = getSoundCloudSearchLink('Stories Avicii');
      axiosMock
        .onGet(soundCloudSearchUrl)
        .reply(200, searchSnapshots.soundCloudStoriesAvicii);

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9hbGJ1bS83ZHFmdEoza2FzNkQwVkFkbXQzazNW',
        type: 'album',
        title: 'Stories - Album by Avicii | Spotify',
        description: 'Avicii · album · 2015 · 14 songs',
        image: 'https://i.scdn.co/image/ab67616d0000b2735393c5d3cac806092a9bc468',
        source: 'https://open.spotify.com/album/7dqftJ3kas6D0VAdmt3k3V',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            type: 'spotify',
            url: 'https://open.spotify.com/album/7dqftJ3kas6D0VAdmt3k3V',
            isVerified: true,
          },
          {
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/album/stories/1440834059',
            isVerified: false,
            notAvailable: false,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/album/11191996',
            isVerified: false,
            notAvailable: false,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/aviciiofficial/sets/stories-253',
            isVerified: false,
            notAvailable: false,
          },
        ],
      });
    });
  });

  describe('GET /search - Artist', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5';

      // Mock Spotify metadata API
      axiosMock
        .onGet('https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5')
        .reply(200, headSnapshots.spotifyArtistJCole);

      // Mock adapter API calls
      axiosMock
        .onGet(/music\.apple\.com.*search/)
        .reply(200, searchSnapshots.appleMusicJCole);

      axiosMock
        .onGet(/api\.deezer\.com.*search.*artist/)
        .reply(200, JSON.parse(searchSnapshots.deezerJCole));

      const soundCloudSearchUrl = getSoundCloudSearchLink('J. Cole');
      axiosMock.onGet(soundCloudSearchUrl).reply(200, searchSnapshots.soundCloudJCole);

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9hcnRpc3QvNmwzSHZRNXNhNm1YVHNNVEIxOXJPNQ',
        type: 'artist',
        title: 'J. Cole',
        description: 'Artist · 32.9M monthly listeners.',
        image: 'https://i.scdn.co/image/ab6761610000e5eb4b053c29fd4b317ff825f0dc',
        source: 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            notAvailable: false,
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/artist/j-cole/73705833',
          },
          {
            isVerified: true,
            notAvailable: false,
            type: 'deezer',
            url: 'https://www.deezer.com/artist/339209',
          },
          {
            isVerified: true,
            notAvailable: false,
            type: 'soundCloud',
            url: 'https://soundcloud.com/j-cole',
          },
          {
            isVerified: true,
            type: 'spotify',
            url: 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5',
          },
        ],
      });
    });
  });

  describe('GET /search - Playlist', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ';

      // Mock Spotify metadata API
      axiosMock
        .onGet('https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ')
        .reply(200, headSnapshots.spotifyPlaylistBadBunny);

      // Mock adapter API calls
      axiosMock
        .onGet(/music\.apple\.com.*search/)
        .reply(200, searchSnapshots.appleMusicBadBunnyPlaylist);

      axiosMock
        .onGet(/api\.deezer\.com.*search.*playlist/)
        .reply(200, JSON.parse(searchSnapshots.deezerBadBunnyPlaylist));

      const soundCloudSearchUrl = getSoundCloudSearchLink('This Is Bad Bunny');
      axiosMock
        .onGet(soundCloudSearchUrl)
        .reply(200, searchSnapshots.soundCloudThisIsBadBunny);

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9wbGF5bGlzdC8zN2k5ZFFaRjFEWDJhcFd6eUVDd3la',
        type: 'playlist',
        title: 'This Is Bad Bunny',
        description: 'Playlist · Spotify · 129 items · 5.8M saves',
        image: 'https://i.scdn.co/image/ab67706f00000002a548bbf4cd54767b735f9701',
        source: 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            notAvailable: false,
            type: 'deezer',
            url: 'https://www.deezer.com/playlist/13821871021',
          },
          {
            isVerified: true,
            type: 'spotify',
            url: 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ',
          },
          {
            isVerified: false,
            notAvailable: false,
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/playlist/bad-bunny-essentials/pl.1c35ac10cfe848aaa19f68ebe62ea46e',
          },
          {
            isVerified: false,
            notAvailable: false,
            type: 'soundCloud',
            url: 'https://soundcloud.com/dodo-boys-in-the-hood/bad-bunny-eoo-dodo-edit-perreo',
          },
        ],
      });
    });
  });

  describe('GET /search - Podcast Show', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/episode/2uvOfpJRRliCWpbiCXKf4Q';

      // Mock Spotify metadata API
      axiosMock
        .onGet(/open\.spotify\.com\/episode\/2uvOfpJRRliCWpbiCXKf4Q/)
        .reply(200, headSnapshots.spotifyEpisodeTerceraVuelta);

      // Mock adapter API calls - podcasts usually don't have matches on other platforms
      axiosMock.onGet(/music\.apple\.com.*search/).reply(200, '<div></div>');
      axiosMock.onGet(/api\.deezer\.com.*search/).reply(200, { data: [] });
      const soundCloudSearchUrl = getSoundCloudSearchLink(
        '¿Dónde estabas el 6 de noviembre del año 1985?'
      );
      axiosMock
        .onGet(soundCloudSearchUrl)
        .reply(200, searchSnapshots.soundCloudTerceraVuelta);
      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9lcGlzb2RlLzJ1dk9mcEpSUmxpQ1dwYmlDWEtmNFE',
        type: 'podcast',
        title: '¿Dónde estabas el 6 de noviembre del año 1985?',
        description: 'Tercera Vuelta · Episode',
        image: 'https://i.scdn.co/image/ab6765630000ba8a85c9dd1468476ba33d95f0e9',
        audio:
          'https://podz-content.spotifycdn.com/audio/clips/6omeNtNZD86P8h4edCGXRl/clip_176359_236359.mp3',
        source: 'https://open.spotify.com/episode/2uvOfpJRRliCWpbiCXKf4Q',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            type: 'spotify',
            url: 'https://open.spotify.com/episode/2uvOfpJRRliCWpbiCXKf4Q',
          },
        ],
      });
    });
  });

  describe('GET /search - Podcast Episode', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT';

      // Mock Spotify metadata API
      axiosMock
        .onGet('https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT')
        .reply(200, headSnapshots.spotifyEpisodeWaveform);

      // Mock adapter API calls
      axiosMock.onGet(/music\.apple\.com.*search/).reply(200, '<div></div>');
      axiosMock.onGet(/api\.deezer\.com.*search/).reply(200, { data: [] });
      const soundCloudSearchUrl = getSoundCloudSearchLink(
        'The End of Twitter as We Know It'
      );
      axiosMock
        .onGet(soundCloudSearchUrl)
        .reply(200, searchSnapshots.soundCloudWaveformEndOfTwitter);
      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9lcGlzb2RlLzQzVENyZ21QMjNxa0xjQVhaUU44cVQ',
        type: 'podcast',
        title: 'The End of Twitter as We Know It',
        description: 'Waveform: The MKBHD Podcast · Episode',
        image: 'https://i.scdn.co/image/ab6765630000ba8a7878c8215f202b56b20a007e',
        audio:
          'https://podz-content.spotifycdn.com/audio/clips/3GYsio7wUsfky3DC7ut4uL/clip_140000_202520.mp3',
        source: 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            type: 'spotify',
            url: 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT',
          },
          {
            isVerified: false,
            notAvailable: false,
            type: 'soundCloud',
            url: 'https://soundcloud.com/ipc-sound-room/its-the-end-of-the-world-as-we-know-it',
          },
        ],
      });
    });
  });
});
