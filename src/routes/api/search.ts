import { APIEvent, json } from 'solid-start/api';

import type { SpotifyContent, Error } from '~/@types/global';

import { getSpotifyMetadata } from '~/server/services/spotify';
import { getYoutubeLink } from '~/server/services/youtube';
import { getAppleMusicLink } from '~/server/services/appleMusic';
import { getTidalLink } from '~/server/services/tidal';
import { getSoundcloudLink } from '~/server/services/soundcloud';

import { incrementSearchCount } from '~/server/services/searchCount';

import { SPOTIFY_LINK_REGEX } from '~/constants';

const apiError = (message: string, status: number): Response => new Response(
  JSON.stringify({ message }),
  {
    status,
    headers: { 'Content-Type': 'application/json' },
  },
);

export async function GET({ request }: APIEvent) {
  const url = new URL(request.url);

  const { spotifyLink } = Object.fromEntries(url.searchParams);

  console.log('spotifyLink', spotifyLink);

  if (!SPOTIFY_LINK_REGEX.test(spotifyLink)) {
    return apiError('Invalid Spotify link', 400);
  }

  try {
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

    return json(song);
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
