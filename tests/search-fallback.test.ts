import type { Server } from 'bun';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { cacheStore } from '~/services/cache';

import { loadHeadSnapshots } from './mocks/snapshots';
import { HttpMock } from './utils/http-mock';
import { createTestApp, nodeFetch } from './utils/request';
import { apiSearchEndpoint } from './utils/shared';

const headSnapshots = loadHeadSnapshots();

// Own file for module-state isolation: the shared musicBrainz service guard
// trips its circuit after a few unmocked fallbacks, which would block this
// test if it lived alongside the other search tests.
describe('MusicBrainz fallback replaces unavailable links', () => {
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
    httpMock.restore();
  });

  beforeEach(() => {
    cacheStore.reset();
    httpMock.reset();
  });

  it('replaces a not-available YouTube result with the verified fallback, no duplicate', async () => {
    const link = 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc';

    httpMock
      .onGet('https://open.spotify.com/embed/track/3AhXZa8sUQht0UEdBJgpGc')
      .reply(200, headSnapshots.spotifyTrackRollingStone);

    httpMock.onGet(/youtube\.googleapis\.com/).reply(200, {
      items: [
        {
          kind: 'youtube#searchResult',
          etag: 'x',
          id: { kind: 'youtube#video', videoId: 'junk123' },
          snippet: { title: 'Totally Unrelated Video', channelTitle: 'Someone Else' },
        },
      ],
    });

    httpMock.onGet('musicbrainz.org/ws/2/recording/?query=').reply(200, {
      recordings: [
        {
          id: 'mbid-rolling-stone',
          title: 'Like a Rolling Stone',
          'artist-credit': [{ name: 'Bob Dylan' }],
        },
      ],
    });
    httpMock.onGet('inc=url-rels').reply(200, {
      relations: [
        {
          type: 'streaming',
          url: { resource: 'https://music.youtube.com/watch?v=realvideo1' },
        },
      ],
    });

    const response = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link }),
    });

    const data = await response.json();
    const youTubeLinks = data.links.filter(
      (entry: { type: string }) => entry.type === 'youTube'
    );

    expect(youTubeLinks).toEqual([
      {
        type: 'youTube',
        url: 'https://music.youtube.com/watch?v=realvideo1',
        isVerified: true,
      },
    ]);
  });
});
