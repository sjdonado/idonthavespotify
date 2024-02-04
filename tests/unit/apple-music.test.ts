import { beforeAll, afterEach, describe, expect, it, spyOn, jest } from 'bun:test';

import axios from 'axios';
import Redis from 'ioredis';
import AxiosMockAdapter from 'axios-mock-adapter';

import { getAppleMusicLink } from '~/adapters/apple-music';
import { SpotifyContentLinkType } from '~/services/search';
import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';

import { getAppleMusicSearchLink } from '../utils/shared';

const appleMusicSongResponseMock = await Bun.file(
  'tests/fixtures/apple-music/songResponseMock.html'
).text();

describe('Adapter - Apple Music', () => {
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
    mock.reset();
  });

  it('should return verified link', async () => {
    const query = 'Do Not Disturb Drake';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);

    const appleMusicLink = await getAppleMusicLink(query, {
      type: SpotifyMetadataType.Song,
    } as SpotifyMetadata);

    expect(appleMusicLink).toEqual({
      type: SpotifyContentLinkType.AppleMusic,
      url: 'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237',
      isVerified: true,
    });

    expect(mock.history.get).toHaveLength(1);
  });
});
