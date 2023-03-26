import * as cheerio from 'cheerio';

import { MetadataType } from '~/@types/global';

export interface SpotifyMetadata {
  title: string;
  description: string;
  type: MetadataType;
  image: string;
  audio?: string;
}

function metaTagContent(doc: cheerio.CheerioAPI, type: string, attr: string) {
  return doc(`meta[${attr}='${type}']`).attr('content');
}

export const getSpotifyMetadata = async (songLink: string): Promise<SpotifyMetadata> => {
  const html = await fetch(songLink).then((res) => res.text());
  const doc = cheerio.load(html);

  const title = metaTagContent(doc, 'og:title', 'property');
  const description = metaTagContent(doc, 'og:description', 'property');
  const image = metaTagContent(doc, 'og:image', 'property');
  const audio = metaTagContent(doc, 'og:audio', 'property');

  const type = songLink.includes('episode') ? MetadataType.Podcast : metaTagContent(doc, 'og:type', 'property');

  if (!title || !description || !type || !image) {
    throw new Error('Could not parse Spotify metadata');
  }

  return {
    title,
    description,
    type: type as MetadataType,
    image,
    audio,
  };
};
