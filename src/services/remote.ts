import server$ from 'solid-start/server';

import { Song } from '~/components/SongCard';

import { getSpotifyMetadata } from '~/server/spotify';
import { getYoutubeLink } from '~/server/youtube';
import { getAppleMusicLink } from '~/server/appleMusic';
import { getTidalLink } from '~/server/tidal';
import { getSoundcloudLink } from '~/server/soundcloud';

import { verityCaptcha } from '~/utils/captcha';

export const fetchSong = server$(async (songLink: string, token: string): Promise<Song> => {
  const captchaSuccess = await verityCaptcha(token);

  if (!captchaSuccess) {
    throw new Error('Captcha failed');
  }

  const metadata = await getSpotifyMetadata(songLink);

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

  return song;
});
