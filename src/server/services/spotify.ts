import { SpotifyMetadataType } from '~/@types/global';

import { getCheerioDoc, metaTagContent } from '~/utils/metaContent';

export interface SpotifyMetadata {
  title: string;
  description: string;
  type: SpotifyMetadataType;
  image: string;
  audio?: string;
}

export const getSpotifyMetadata = async (spotifyLink: string): Promise<SpotifyMetadata> => {
  const html = await fetch(spotifyLink).then((res) => res.text());
  const doc = getCheerioDoc(html);

  const title = metaTagContent(doc, 'og:title', 'property');
  const description = metaTagContent(doc, 'og:description', 'property');
  const image = metaTagContent(doc, 'og:image', 'property');
  const audio = metaTagContent(doc, 'og:audio', 'property');

  const type = spotifyLink.includes('episode') ? SpotifyMetadataType.Podcast : metaTagContent(doc, 'og:type', 'property');

  if (!title || !description || !type || !image) {
    throw new Error('Could not parse Spotify metadata');
  }

  return {
    title,
    description,
    type: type as SpotifyMetadataType,
    image,
    audio,
  };
};
