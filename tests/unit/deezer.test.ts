import { beforeAll, afterEach, describe, expect, it, spyOn, jest } from 'bun:test';

import axios from 'axios';
import Redis from 'ioredis';
import AxiosMockAdapter from 'axios-mock-adapter';

import { getDeezerLink } from '~/adapters/deezer';
import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { SpotifyContentLinkType } from '~/services/search';

import { getDeezerSearchLink } from '../utils/shared';

import deezerSongResponseMock from '../fixtures/deezer/songResponseMock.json';

describe('Adapter - Deezer', () => {
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

    const deezerSearchLink = getDeezerSearchLink(query, 'track');
    mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);

    const deezerLink = await getDeezerLink(query, {
      type: SpotifyMetadataType.Song,
    } as SpotifyMetadata);

    expect(deezerLink).toEqual({
      type: SpotifyContentLinkType.Deezer,
      url: 'https://www.deezer.com/track/144572248',
      isVerified: true,
    });

    expect(mock.history.get).toHaveLength(1);
  });
});
