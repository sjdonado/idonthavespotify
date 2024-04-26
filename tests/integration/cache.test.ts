import { afterEach, describe, expect, it, mock, jest } from 'bun:test';

import { app } from '~/index';
import { getCachedSearchResult } from '~/services/cache';

import { JSONRequest } from '../utils/request';
import { API_SEARCH_ENDPOINT, cachedResponse, cachedSpotifyLink } from '../utils/shared';

mock.module('~/services/cache', () => ({
  getCachedSearchResult: jest.fn(),
}));

describe('Searches cache', () => {
  const getCachedSearchResultMock = getCachedSearchResult as jest.Mock;

  afterEach(() => {
    getCachedSearchResultMock.mockClear();
  });

  it('should return 200 from cache', async () => {
    getCachedSearchResultMock.mockReturnValueOnce(cachedResponse);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink: cachedSpotifyLink });
    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual(cachedResponse);

    expect(getCachedSearchResultMock).toHaveBeenCalledTimes(1);
  });
});
