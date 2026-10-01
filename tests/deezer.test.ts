import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { getDeezerLink } from '~/adapters/deezer';
import { MetadataType, Parser } from '~/config/enum';
import { cacheStore } from '~/services/cache';

import { loadSearchSnapshots } from './mocks/snapshots';
import { HttpMock } from './utils/http-mock';

const searchSnapshots = loadSearchSnapshots();

describe('Deezer adapter ISRC hand-off', () => {
  let httpMock: HttpMock;

  beforeEach(() => {
    cacheStore.reset();
    httpMock = new HttpMock();
    httpMock
      .onGet(/api\.deezer\.com.*search/)
      .reply(200, JSON.parse(searchSnapshots.deezerRollingStone));
  });

  afterEach(() => {
    httpMock.restore();
  });

  it('attaches the ISRC to a verified song hit', async () => {
    const link = await getDeezerLink(
      'Like a Rolling Stone Bob Dylan',
      { title: 'Like a Rolling Stone', description: 'Bob Dylan', type: MetadataType.Song },
      Parser.Spotify,
      'deezer-isrc-song'
    );

    expect(link).toMatchObject({
      url: 'https://www.deezer.com/track/14477354',
      isVerified: true,
      isrc: 'USSM19922509',
    });
  });

  it('leaves the ISRC off non-song searches', async () => {
    const link = await getDeezerLink(
      'Like a Rolling Stone Bob Dylan',
      { title: 'Like a Rolling Stone', description: 'Bob Dylan', type: MetadataType.Album },
      Parser.Spotify,
      'deezer-isrc-album'
    );

    expect(link?.isVerified).toBe(true);
    expect(link?.isrc).toBeUndefined();
  });
});
