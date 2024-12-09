import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { afterEach, beforeAll, describe, expect, it } from 'bun:test';

import { getSoundCloudLink } from '~/adapters/sound-cloud';
import { Adapter, MetadataType } from '~/config/enum';
import { SearchMetadata } from '~/services/search';

import { getSoundCloudSearchLink } from '../utils/shared';

const soundCloudSongResponseMock = await Bun.file(
  'tests/fixtures/soundcloud/songResponseMock.html'
).text();

describe('Adapter - SoundCloud', () => {
  let mock: AxiosMockAdapter;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  it('should return verified link', async () => {
    const query = 'Do Not Disturb Drake';

    const soundCloudSearchLink = getSoundCloudSearchLink(query);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);

    const soundCloudLink = await getSoundCloudLink(query, {
      type: MetadataType.Song,
    } as SearchMetadata);

    expect(soundCloudLink).toEqual({
      type: Adapter.SoundCloud,
      url: 'https://soundcloud.com/octobersveryown/drake-do-not-disturb',
      isVerified: true,
    });

    expect(mock.history.get).toHaveLength(1);
  });
});
