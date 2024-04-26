import { afterEach, describe, expect, it, mock, jest } from 'bun:test';

import { getYouTubeLink } from '~/adapters/youtube';
import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { getLinkWithPuppeteer } from '~/utils/scraper';
import { SpotifyContentLinkType } from '~/services/search';

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
      type: SpotifyMetadataType.Song,
    } as SpotifyMetadata);

    expect(youTubeLink).toEqual({
      type: SpotifyContentLinkType.YouTube,
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
