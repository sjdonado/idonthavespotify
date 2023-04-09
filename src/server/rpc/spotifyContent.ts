import server$ from 'solid-start/server';

import type { SpotifyContent } from '~/@types/global';

import { getSpotifyMetadata } from '~/server/services/spotify';
import { getYoutubeLink } from '~/server/services/youtube';
import { getAppleMusicLink } from '~/server/services/appleMusic';
import { getTidalLink } from '~/server/services/tidal';
import { getSoundCloudLink } from '~/server/services/soundcloud';

import { incrementSearchCount } from '~/server/services/searchCount';
import { cacheSpotifyContent, getSpotifyContentFromCache } from '../services/cache';

import { SPOTIFY_ID_REGEX } from '~/constants';

export const buildSpotifyContent = server$(async (spotifyLink: string): Promise<SpotifyContent> => {
  const metadata = await getSpotifyMetadata(spotifyLink);

  const id = (spotifyLink.match(SPOTIFY_ID_REGEX) ?? [])[0]!;

  const links = [];

  const youtubeLink = await getYoutubeLink(metadata);
  const appleMusicLink = getAppleMusicLink(metadata);
  const tidalLink = getTidalLink(metadata);
  const soundcloudLink = getSoundCloudLink(metadata);

  if (youtubeLink) {
    links.push(youtubeLink, appleMusicLink, tidalLink, soundcloudLink);
  }

  const spotifyContent: SpotifyContent = {
    id,
    type: metadata.type,
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    audio: metadata.audio,
    source: spotifyLink,
    links,
  };

  await Promise.all([
    incrementSearchCount(),
    cacheSpotifyContent(spotifyContent),
  ]);

  return spotifyContent;
});

export const fetchSpotifyContent = server$(async (spotifyLink: string): Promise<SpotifyContent> => {
  const spotifyContent = await buildSpotifyContent(spotifyLink);

  return spotifyContent;
});

export const fetchSpotifyContentFromCache = server$(async (id: string): Promise<SpotifyContent | undefined> => {
  const cache = await getSpotifyContentFromCache(id);

  return cache;
});
