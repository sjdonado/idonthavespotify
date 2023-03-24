import * as cheerio from 'cheerio';

import server$ from 'solid-start/server';

interface SpotifyMetadata {
  title: string;
  description: string;
  image: string;
}

function metaTagContent(doc: cheerio.CheerioAPI, type: string, attr: string) {
  return doc(`meta[${attr}='${type}']`).attr('content');
}

export default server$(async (songLink: string): Promise<SpotifyMetadata> => {
  const html = await fetch(songLink).then((res) => res.text());
  const doc = cheerio.load(html);

  const title = metaTagContent(doc, 'og:title', 'property');
  const description = metaTagContent(doc, 'og:description', 'property');
  const image = metaTagContent(doc, 'og:image', 'property');

  if (!title || !description || !image) {
    throw new Error('Could not parse Spotify metadata');
  }

  return {
    title,
    description,
    image,
  };
});
