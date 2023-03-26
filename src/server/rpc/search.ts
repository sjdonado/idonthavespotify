import server$ from 'solid-start/server';

import type { Song } from '~/@types/global';

import { getSpotifyMetadata } from '~/server/services/spotify';
import { getYoutubeLink } from '~/server/services/youtube';
import { getAppleMusicLink } from '~/server/services/appleMusic';
import { getTidalLink } from '~/server/services/tidal';
import { getSoundcloudLink } from '~/server/services/soundcloud';

import { verityCaptcha } from '~/utils/captcha';
import { getSearchCount, incrementSearchCount } from '~/server/services/searchCount';

export const fetchSong = server$(async (spotifyLink: string, token: string): Promise<Song> => {
  const captchaSuccess = await verityCaptcha(token);

  if (!captchaSuccess) {
    throw new Error('Captcha failed');
  }

  const metadata = await getSpotifyMetadata(spotifyLink);

  const youtubeLink = await getYoutubeLink(metadata);
  const appleMusicLink = getAppleMusicLink(metadata);
  const tidalLink = getTidalLink(metadata);
  const soundcloudLink = getSoundcloudLink(metadata);

  const song = {
    ...metadata,
    links: {
      youtube: youtubeLink,
      appleMusic: appleMusicLink,
      tidal: tidalLink,
      soundcloud: soundcloudLink,
    },
  } as Song;

  await incrementSearchCount();

  return song;
});

export const fetchSearchCount = server$(async (): Promise<number> => {
  const searchCount = await getSearchCount();
  return searchCount;
});
