import axios from 'axios';
import {
  SPOTIFY_LINK_DESKTOP_REGEX,
  SPOTIFY_LINK_MOBILE_REGEX,
} from '~/config/constants';

import { getCheerioDoc, metaTagContent } from '~/utils/scraper';

export enum SpotifyMetadataType {
  Song = 'music.song',
  Album = 'music.album',
  Playlist = 'music.playlist',
  Artist = 'profile',
  Podcast = 'music.episode',
  Show = 'website',
}

export type SpotifyMetadata = {
  title: string;
  description: string;
  type: SpotifyMetadataType;
  image: string;
  audio?: string;
};

export const parseSpotifyMetadata = async (
  spotifyLink: string
): Promise<{ metadata: SpotifyMetadata; url: string }> => {
  try {
    let url = spotifyLink;
    let { data: html } = await axios.get(url);

    if (SPOTIFY_LINK_MOBILE_REGEX.test(spotifyLink)) {
      url = html.match(SPOTIFY_LINK_DESKTOP_REGEX)?.[0];

      if (!url) {
        throw new Error(`Could not parse Spotify metadata. Desktop link not found.`);
      }

      // wait a random amount of time to avoid rate limiting
      await new Promise(res => setTimeout(res, Math.random() * 500));

      html = (await axios.get(url)).data;
    }

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');
    const audio = metaTagContent(doc, 'og:audio', 'property');

    const type = spotifyLink.includes('episode')
      ? SpotifyMetadataType.Podcast
      : metaTagContent(doc, 'og:type', 'property');

    if (!title || !description || !type || !image) {
      throw new Error(`Could not parse Spotify metadata.`);
    }

    return {
      metadata: {
        title,
        description,
        type: type as SpotifyMetadataType,
        image,
        audio,
      },
      url,
    };
  } catch (err) {
    throw new Error(`[Spotify Parser] (${spotifyLink}) ${err}`);
  }
};
