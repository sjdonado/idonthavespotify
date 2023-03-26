import { APIEvent, json } from 'solid-start/api';

import type { Song, Error } from '~/@types/global';

import { getSpotifyMetadata } from '~/server/services/spotify';
import { getYoutubeLink } from '~/server/services/youtube';
import { getAppleMusicLink } from '~/server/services/appleMusic';
import { getTidalLink } from '~/server/services/tidal';
import { getSoundcloudLink } from '~/server/services/soundcloud';

import { incrementSearchCount } from '~/server/services/searchCount';

export async function GET({ request }: APIEvent) {
  const url = new URL(request.url);

  const { spotifyLink } = Object.fromEntries(url.searchParams);

  try {
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

    return json(song);
  } catch (error) {
    const { message } = error as Error;
    return json({ error: message });
  }
}
