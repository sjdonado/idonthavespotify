import { APIEvent, json } from 'solid-start/api';

import { type SpotifyContent, SpotifyContentLinkType } from '~/@types/global';

import { SPOTIFY_LINK_REGEX } from '~/constants';
import { buildSpotifyContent } from '~/server/rpc/spotifyContent';

const apiError = (error: string, status: number): Response => new Response(
  JSON.stringify({ error }),
  {
    status,
    headers: { 'Content-Type': 'application/json' },
  },
);

function parseSpotifyContentV1(spotifyContent: SpotifyContent) {
  const youtube = spotifyContent.links.find((link) => link.type === SpotifyContentLinkType.Youtube);
  const appleMusic = spotifyContent.links.find((link) => link.type === SpotifyContentLinkType.AppleMusic);
  const tidal = spotifyContent.links.find((link) => link.type === SpotifyContentLinkType.Tidal);
  const soundcloud = spotifyContent.links.find((link) => link.type === SpotifyContentLinkType.SoundCloud);

  return {
    ...spotifyContent,
    links: {
      youtube: youtube?.url,
      appleMusic: appleMusic?.url,
      tidal: tidal?.url,
      soundcloud: soundcloud?.url,
    },
  };
}

export async function GET({ request }: APIEvent) {
  const url = new URL(request.url);

  const { spotifyLink, v } = Object.fromEntries(url.searchParams);

  if (!SPOTIFY_LINK_REGEX.test(spotifyLink)) {
    return apiError('Invalid Spotify link', 400);
  }

  try {
    const spotifyContent = await buildSpotifyContent(spotifyLink);

    if (!v || v === '1') {
      return json(parseSpotifyContentV1(spotifyContent));
    }

    return json(spotifyContent);
  } catch (error) {
    return apiError((error as Error).message, 500);
  }
}
