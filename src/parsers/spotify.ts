import { getCheerioDoc, metaTagContent } from '~/utils/scraper';
import { fetchSpotifyMetadata } from '~/utils/spotify';

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

export const parseSpotifyMetadata = async (spotifyLink: string) => {
  try {
    const { html, url } = await fetchSpotifyMetadata(spotifyLink);

    const doc = getCheerioDoc(html);

    const title = metaTagContent(doc, 'og:title', 'property');
    const description = metaTagContent(doc, 'og:description', 'property');
    const image = metaTagContent(doc, 'og:image', 'property');
    const audio = metaTagContent(doc, 'og:audio', 'property');

    const type = spotifyLink.includes('episode')
      ? SpotifyMetadataType.Podcast
      : metaTagContent(doc, 'og:type', 'property');

    if (!title || !description || !type || !image) {
      throw new Error('Spotify metadata not found');
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
    } as { metadata: SpotifyMetadata; url: string };
  } catch (err) {
    throw new Error(`[${parseSpotifyMetadata.name}] (${spotifyLink}) ${err}`);
  }
};
