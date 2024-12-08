import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { afterEach, beforeAll, describe, expect, it } from 'bun:test';

import { getYouTubeLink } from '~/adapters/youtube';
import { Adapter, MetadataType } from '~/config/enum';
import { SearchMetadata } from '~/services/search';

import youtubeSongResponseMock from '../fixtures/youtube/songResponseMock.json';
import { getYouTubeSearchLink } from '../utils/shared';

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

    const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Song);
    mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);

    const youtubeLink = await getYouTubeLink(query, {
      type: MetadataType.Song,
    } as SearchMetadata);

    expect(youtubeLink).toEqual({
      type: Adapter.YouTube,
      url: 'https://music.youtube.com/watch?v=vVd4T5NxLgI',
      isVerified: false,
    });

    expect(mock.history.get).toHaveLength(1);
  });
});
