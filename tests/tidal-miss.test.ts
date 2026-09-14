import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { getTidalLink } from '~/adapters/tidal';
import { MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheStore } from '~/services/cache';
import { logger } from '~/utils/logger';

import { HttpMock } from './utils/http-mock';

describe('Tidal edge outcome', () => {
  let httpMock: HttpMock;

  beforeEach(() => {
    cacheStore.reset();
    httpMock = new HttpMock();
    httpMock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
  });

  afterEach(() => {
    httpMock.restore();
  });

  it('turns an upstream 400 into a logged miss, never a throw', async () => {
    const errorSpy = spyOn(logger, 'error');
    try {
      httpMock
        .onGet(/openapi\.tidal\.com.*searchresults/)
        .reply(400, { errors: [{ status: '400', detail: 'Bad request' }] });

      const res = await getTidalLink(
        'Like a Rolling Stone Bob Dylan',
        { title: 'Like a Rolling Stone', description: 'Bob Dylan', type: MetadataType.Song },
        Parser.Spotify,
        'tidal-miss-pin'
      );
      expect(res).toBeNull();

      const logged = errorSpy.mock.calls.map(args => String(args[0])).join('\n');
      expect(logged).toContain('400');
      expect(logged).toContain('Bad request');
    } finally {
      errorSpy.mockRestore();
    }
  });
});
