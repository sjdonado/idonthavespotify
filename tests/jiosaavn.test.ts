import type { Server } from 'bun';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { cacheStore } from '~/services/cache';

import { loadHeadSnapshots } from './mocks/snapshots';
import { HttpMock } from './utils/http-mock';
import { createTestApp, nodeFetch } from './utils/request';
import { apiSearchEndpoint } from './utils/shared';

const LINK = 'https://www.jiosaavn.com/song/kesariya/AgIAQyBeWlI';

const songDetails = {
  rjkrTnma: {
    id: 'rjkrTnma',
    song: 'Kesariya',
    album: 'Brahmastra',
    primary_artists: 'Pritam, Arijit Singh, Amitabh Bhattacharya',
    image: 'https://c.saavncdn.com/871/image-150x150.jpg',
    media_preview_url: 'https://preview.saavncdn.com/871/preview_96_p.mp4',
  },
};

const songSearch = {
  total: 1,
  start: 1,
  results: [
    {
      id: 'rjkrTnma',
      song: 'Kesariya',
      album: 'Brahmastra',
      primary_artists: 'Pritam, Arijit Singh, Amitabh Bhattacharya',
      image: 'https://c.saavncdn.com/871/image-150x150.jpg',
      perma_url: 'https://www.jiosaavn.com/song/kesariya/AgIAQyBeWlI',
    },
  ],
};

const albumDetails = {
  title: 'Brahmastra',
  primary_artists: 'Pritam, Amitabh Bhattacharya',
  image: 'https://c.saavncdn.com/871/image-150x150.jpg',
};

const albumSearch = {
  total: 1,
  start: 1,
  results: [
    {
      albumid: '38845390',
      title: 'Brahmastra',
      primary_artists: 'Pritam, Amitabh Bhattacharya',
      image: 'https://c.saavncdn.com/871/image-150x150.jpg',
      perma_url: 'https://www.jiosaavn.com/album/brahmastra/xq4v9ZFC9iA_',
    },
  ],
};

const artistDetails = {
  artistId: '459320',
  name: 'Arijit Singh',
  type: 'artist',
  image: 'https://c.saavncdn.com/artists/image_150x150.jpg',
};

const artistSearch = {
  total: 1,
  start: 1,
  results: [
    {
      name: 'Arijit Singh',
      id: '459320',
      image: 'https://c.saavncdn.com/artists/image_150x150.jpg',
      perma_url: 'https://www.jiosaavn.com/artist/arijit-singh-songs/LlRWpHzy3Hk_',
      type: 'artist',
    },
  ],
};

const playlistDetails = {
  listid: '32049168',
  listname: 'Bollywood Bappa',
  type: 'playlist',
  image: 'https://c.saavncdn.com/editorial/image_150x150.jpg',
};

const playlistSearch = {
  total: 1,
  start: 1,
  results: [
    {
      listid: '32049168',
      listname: 'Bollywood Bappa',
      image: 'https://c.saavncdn.com/editorial/image_150x150.jpg',
      perma_url: 'https://www.jiosaavn.com/featured/bollywood-bappa/B6QQ8fKsUOQ_',
    },
  ],
};

describe('Jiosaavn end to end', () => {
  let app: Server<undefined>;
  let searchEndpointUrl: string;
  let httpMock: HttpMock;

  beforeAll(() => {
    app = createTestApp();
    searchEndpointUrl = apiSearchEndpoint(app.url);
    httpMock = new HttpMock();
  });

  afterAll(() => {
    app.stop();
    cacheStore.reset();
    httpMock.restore();
  });

  beforeEach(() => {
    cacheStore.reset();
    httpMock.reset();
  });

  const headSnapshots = loadHeadSnapshots();

  it('produces a full adapter row for a foreign source', async () => {
    // Spotify source, so the JioSaavn adapter itself runs (it is
    // skipped for same-type sources, where the origin row stands in).
    httpMock
      .onGet('https://open.spotify.com/embed/track/3AhXZa8sUQht0UEdBJgpGc')
      .reply(200, headSnapshots.spotifyTrackRollingStone);
    httpMock.onGet(/search\.getResults/).reply(200, {
      total: 1,
      results: [
        {
          song: 'Like a Rolling Stone',
          primary_artists: 'Bob Dylan',
          perma_url:
            'https://www.jiosaavn.com/song/like-a-rolling-stone/xyz123',
        },
      ],
    });

    const response = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        link: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        adapters: ['spotify', 'jiosaavn'],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.links).toContainEqual({
      type: 'jiosaavn',
      url: 'https://www.jiosaavn.com/song/like-a-rolling-stone/xyz123',
      isVerified: true,
      notAvailable: false,
    });
  });

  it('converts a JioSaavn song link, including a JioSaavn target', async () => {
    // Only JioSaavn calls are stubbed; every other adapter misses its
    // mock and degrades, so the assertions below prove the new wiring.
    httpMock.onGet(/webapi\.get/).reply(200, songDetails);
    httpMock.onGet(/search\.getResults/).reply(200, songSearch);

    const response = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: LINK }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.source).toBe(LINK);
    expect(data.type).toBe('song');
    expect(data.universalLink).toMatch(/^\S+\?id=.+/);
    const jiosaavn = data.links.find(
      (link: { type: string }) => link.type === 'jiosaavn'
    );
    expect(jiosaavn).toEqual({
      // Source-parser row: the app marks the origin link verified
      // without a notAvailable flag.
      type: 'jiosaavn',
      url: 'https://www.jiosaavn.com/song/kesariya/AgIAQyBeWlI',
      isVerified: true,
    });
    httpMock.reset();
  });

  it.each([
    [
      'album',
      'album',
      'https://www.jiosaavn.com/album/brahmastra/xq4v9ZFC9iA_',
      albumDetails,
      /search\.getAlbumResults/,
      albumSearch,
      'https://www.jiosaavn.com/album/brahmastra/xq4v9ZFC9iA_',
      false,
    ],
    [
      'artist',
      'artist',
      'https://www.jiosaavn.com/artist/arijit-singh-songs/LlRWpHzy3Hk_',
      artistDetails,
      /search\.getArtistResults/,
      artistSearch,
      'https://www.jiosaavn.com/artist/arijit-singh-songs/LlRWpHzy3Hk_',
      false,
    ],
    [
      'playlist',
      'playlist',
      'https://www.jiosaavn.com/featured/bollywood-bappa/B6QQ8fKsUOQ_',
      playlistDetails,
      /search\.getPlaylistResults/,
      playlistSearch,
      'https://www.jiosaavn.com/featured/bollywood-bappa/B6QQ8fKsUOQ_',
      true,
    ],
  ])(
    'converts a JioSaavn %s link, including a JioSaavn target',
    async (
      _kind,
      expectedType,
      link,
      details,
      searchPattern,
      search,
      permaUrl,
      stringBody
    ) => {
      httpMock.onGet(/webapi\.get/).reply(200, details);
      // One case answers with a text body to cover the text/html quirk.
      httpMock
        .onGet(searchPattern as RegExp)
        .reply(200, stringBody ? JSON.stringify(search) : search);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.source).toBe(link);
      expect(data.type).toBe(expectedType);
      const jiosaavn = data.links.find(
        (l: { type: string }) => l.type === 'jiosaavn'
      );
      expect(jiosaavn).toEqual({
        type: 'jiosaavn',
        url: permaUrl,
        isVerified: true,
      });
      httpMock.reset();
    }
  );
});
