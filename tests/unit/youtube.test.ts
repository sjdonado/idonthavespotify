import { afterEach, describe, expect, it, mock, jest } from 'bun:test';

import { MetadataType, Adapter } from '~/config/enum';
import { getYouTubeLink } from '~/adapters/youtube';
import { getLinkWithPuppeteer } from '~/utils/scraper';
import { SearchMetadata } from '~/services/search';

import { getYouTubeSearchLink } from '../utils/shared';

mock.module('~/utils/scraper', () => ({
  getLinkWithPuppeteer: jest.fn(),
}));

describe('Adapter - YouTube', () => {
  const getLinkWithPuppeteerMock = getLinkWithPuppeteer as jest.Mock;

  afterEach(() => {
    getLinkWithPuppeteerMock.mockClear();
  });

  it('should return verified link', async () => {
    const query = 'Do Not Disturb Drake';

    const searchLink = getYouTubeSearchLink(query, 'song');

    const mockedYoutubeLink = 'https://music.youtube.com/watch?v=zhY_0DoQCQs';
    getLinkWithPuppeteerMock.mockResolvedValueOnce(mockedYoutubeLink);

    const youTubeLink = await getYouTubeLink(query, {
      type: MetadataType.Song,
    } as SearchMetadata);

    expect(youTubeLink).toEqual({
      type: Adapter.YouTube,
      url: mockedYoutubeLink,
      isVerified: true,
    });

    expect(getLinkWithPuppeteerMock).toHaveBeenCalledTimes(1);
    expect(getLinkWithPuppeteerMock).toHaveBeenCalledWith(
      expect.stringContaining(searchLink),
      'ytmusic-card-shelf-renderer a',
      expect.any(Array)
    );
  });
});
