import server$ from 'solid-start/server';

import type { SpotifyContent } from '~/@types/global';

import { getSpotifyMetadata } from '~/server/services/spotify';
import { getYoutubeLink } from '~/server/services/youtube';
import { getAppleMusicLink } from '~/server/services/appleMusic';
import { getTidalLink } from '~/server/services/tidal';
import { getSoundcloudLink } from '~/server/services/soundcloud';

import { verityCaptcha } from '~/utils/captcha';
import { incrementSearchCount } from '~/server/services/searchCount';

export default server$(async (spotifyLink: string, token: string): Promise<SpotifyContent> => {
  const captchaSuccess = await verityCaptcha(token);

  if (!captchaSuccess) {
    throw new Error('Captcha failed');
  }

  const metadata = await getSpotifyMetadata(spotifyLink);

  const youtubeLink = await getYoutubeLink(metadata);
  const appleMusicLink = getAppleMusicLink(metadata);
  const tidalLink = getTidalLink(metadata);
  const soundcloudLink = getSoundcloudLink(metadata);

  const song: SpotifyContent = {
    ...metadata,
    links: {
      youtube: youtubeLink,
      appleMusic: appleMusicLink,
      tidal: tidalLink,
      soundcloud: soundcloudLink,
    },
  };

  await incrementSearchCount();

  return song;
});
