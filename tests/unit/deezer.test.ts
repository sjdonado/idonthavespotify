import { beforeAll, afterEach, describe, expect, it } from 'bun:test';

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import { MetadataType, Adapter } from '~/config/enum';
import { getDeezerLink } from '~/adapters/deezer';
import { SearchMetadata } from '~/services/search';

import { getDeezerSearchLink } from '../utils/shared';

import deezerSongResponseMock from '../fixtures/deezer/songResponseMock.json';

describe('Adapter - Deezer', () => {
  let mock: AxiosMockAdapter;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  it('should return verified link', async () => {
    const query = 'Do Not Disturb Drake';

    const deezerSearchLink = getDeezerSearchLink(query, 'track');
    mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);

    const deezerLink = await getDeezerLink(query, {
      type: MetadataType.Song,
    } as SearchMetadata);

    expect(deezerLink).toEqual({
      type: Adapter.Deezer,
      url: 'https://www.deezer.com/track/144572248',
      isVerified: true,
    });

    expect(mock.history.get).toHaveLength(1);
  });
});
