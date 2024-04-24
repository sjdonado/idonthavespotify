import { beforeAll, afterEach, describe, expect, it } from 'bun:test';

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import { getYouTubeLink } from '~/adapters/youtube';
import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { SpotifyContentLinkType } from '~/services/search';

import { getYouTubeSearchLink } from '../utils/shared';

import youTubeSongResponseMock from '../fixtures/youtube/songResponseMock.json';

describe('Adapter - YouTube', () => {
  let mock: AxiosMockAdapter;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  it('should return verified link', async () => {
    const query = 'Do Not Disturb Drake';

    const youTubeSearchLink = getYouTubeSearchLink(query, 'video');
    mock.onGet(youTubeSearchLink).reply(200, youTubeSongResponseMock);

    const youTubeLink = await getYouTubeLink(query, {
      type: SpotifyMetadataType.Song,
    } as SpotifyMetadata);

    expect(youTubeLink).toEqual({
      type: SpotifyContentLinkType.YouTube,
      url: 'https://www.youtube.com/watch?v=zhY_0DoQCQs',
      isVerified: true,
    });

    expect(mock.history.get).toHaveLength(1);
  });
});
