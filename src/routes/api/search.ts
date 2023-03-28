import { APIEvent, json } from 'solid-start/api';

import { SPOTIFY_LINK_REGEX } from '~/constants';
import { buildSpotifyContent } from '~/server/rpc/spotifyContent';

const apiError = (error: string, status: number): Response => new Response(
  JSON.stringify({ error }),
  {
    status,
    headers: { 'Content-Type': 'application/json' },
  },
);

export async function GET({ request }: APIEvent) {
  const url = new URL(request.url);

  const { spotifyLink } = Object.fromEntries(url.searchParams);

  if (!SPOTIFY_LINK_REGEX.test(spotifyLink)) {
    return apiError('Invalid Spotify link', 400);
  }

  try {
    const spotifyContent = await buildSpotifyContent(spotifyLink);
    return json(spotifyContent);
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
