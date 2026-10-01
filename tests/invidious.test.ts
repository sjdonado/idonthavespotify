import { describe, expect, it } from 'bun:test';

import { toInvidiousLink } from '~/adapters/invidious';
import { Adapter } from '~/config/enum';

const youTube = (url: string, extra: { isVerified?: boolean } = {}) => ({
  type: Adapter.YouTube,
  url,
  isVerified: true,
  ...extra,
});

describe('toInvidiousLink', () => {
  it('maps a watch link and drops tracking params', () => {
    expect(toInvidiousLink(youTube('https://music.youtube.com/watch?v=ji-Ac3FgTZ4&si=abc'))).toEqual({
      type: Adapter.Invidious,
      url: 'https://redirect.invidious.io/watch?v=ji-Ac3FgTZ4',
      isVerified: true,
    });
  });

  it('maps playlists, channels, and youtu.be links', () => {
    expect(
      toInvidiousLink(youTube('https://music.youtube.com/playlist?list=OLAK5uy_abc'))?.url
    ).toBe('https://redirect.invidious.io/playlist?list=OLAK5uy_abc');
    expect(
      toInvidiousLink(youTube('https://music.youtube.com/channel/UC123/videos'))?.url
    ).toBe('https://redirect.invidious.io/channel/UC123');
    expect(toInvidiousLink(youTube('https://youtu.be/ji-Ac3FgTZ4/?si=x'))?.url).toBe(
      'https://redirect.invidious.io/watch?v=ji-Ac3FgTZ4'
    );
  });

  it('maps video ids carried in the path', () => {
    for (const url of [
      'https://music.youtube.com/podcast/ep123',
      'https://www.youtube.com/shorts/ep123',
      'https://www.youtube.com/embed/ep123',
    ]) {
      expect(toInvidiousLink(youTube(url))?.url).toBe('https://redirect.invidious.io/watch?v=ep123');
    }
  });

  it('carries the verification flag over', () => {
    expect(
      toInvidiousLink(youTube('https://music.youtube.com/watch?v=x', { isVerified: false }))
    ).toMatchObject({ isVerified: false });
  });

  it('returns null for paths Invidious cannot mirror', () => {
    expect(toInvidiousLink(youTube('https://music.youtube.com/browse/MPREb_x'))).toBeNull();
    expect(toInvidiousLink(youTube('not a url'))).toBeNull();
  });
});
