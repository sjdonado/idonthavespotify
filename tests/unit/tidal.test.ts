import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { afterEach, beforeAll, describe, expect, it } from 'bun:test';

import { getTidalLink } from '~/adapters/tidal';
import { Adapter, MetadataType } from '~/config/enum';
import { SearchMetadata } from '~/services/search';

import tidalSongResponseMock from '../fixtures/tidal/songResponseMock.json';
import { getTidalSearchLink } from '../utils/shared';

describe('Adapter - Youtube', () => {
  let mock: AxiosMockAdapter;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  it('should return verified link', async () => {
    const query = 'Do Not Disturb Drake';

    const tidalSearchLink = getTidalSearchLink(query, MetadataType.Song);
    mock.onGet(tidalSearchLink).reply(200, tidalSongResponseMock);

    const tidalLink = await getTidalLink(query, {
      type: MetadataType.Song,
    } as SearchMetadata);

    expect(tidalLink).toEqual({
      type: Adapter.Tidal,
      url: 'https://www.tidal.com/track/144572248',
      isVerified: true,
    });

    expect(mock.history.get).toHaveLength(1);
  });
});
