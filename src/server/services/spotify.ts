import * as cheerio from 'cheerio';

import { SpotifyMetadataType } from '~/@types/global';

export interface SpotifyMetadata {
  title: string;
  description: string;
  type: SpotifyMetadataType;
  image: string;
  audio?: string;
}

function metaTagContent(doc: cheerio.CheerioAPI, type: string, attr: string) {
  return doc(`meta[${attr}='${type}']`).attr('content');
}

export const getSpotifyMetadata = async (spotifyLink: string): Promise<SpotifyMetadata> => {
  const html = await fetch(spotifyLink).then((res) => res.text());
  const doc = cheerio.load(html);

  const title = metaTagContent(doc, 'og:title', 'property');
  const description = metaTagContent(doc, 'og:description', 'property');
  const image = metaTagContent(doc, 'og:image', 'property');
  const audio = metaTagContent(doc, 'og:audio', 'property');

  const type = spotifyLink.includes('episode') ? SpotifyMetadataType.Podcast : metaTagContent(doc, 'og:type', 'property') as SpotifyMetadataType;

  if (!title || !description || !type || !image) {
    throw new Error('Could not parse Spotify metadata');
  }

  return {
    title,
    description,
    type,
    image,
    audio,
  };
};
