import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { MetadataType, Parser } from '~/config/enum';
import { getJiosaavnMetadata, getJiosaavnQueryFromMetadata } from '~/parsers/jiosaavn';
import { getSearchParser } from '~/parsers/link';
import { cacheStore } from '~/services/cache';

import { HttpMock } from '../utils/http-mock';

const SONG_LINK = 'https://www.jiosaavn.com/song/kesariya/AgIAQyBeWlI';
const ALBUM_LINK = 'https://www.jiosaavn.com/album/brahmastra/xq4v9ZFC9iA_';
const ARTIST_LINK = 'https://www.jiosaavn.com/artist/arijit-singh-songs/LlRWpHzy3Hk_';
const PLAYLIST_LINK = 'https://www.jiosaavn.com/featured/bollywood-bappa/B6QQ8fKsUOQ_';
const PLAYLIST_KIND_LINK = 'https://www.jiosaavn.com/playlist/bollywood-bappa/B6QQ8fKsUOQ_';

const songDetails = {
  rjkrTnma: {
    id: 'rjkrTnma',
    song: 'Kesariya',
    album: 'Brahmastra',
    primary_artists: 'Pritam, Arijit Singh, Amitabh Bhattacharya',
    image: 'https://c.saavncdn.com/871/image-150x150.jpg',
    media_preview_url: 'https://preview.saavncdn.com/871/preview_96_p.mp4',
  },
};

const albumDetails = {
  title: 'Brahmastra',
  primary_artists: 'Pritam, Amitabh Bhattacharya',
  image: 'https://c.saavncdn.com/871/image-150x150.jpg',
};

const artistDetails = {
  artistId: '459320',
  name: 'Arijit Singh',
  type: 'artist',
  image: 'https://c.saavncdn.com/artists/image_150x150.jpg',
};

const playlistDetails = {
  listid: '32049168',
  listname: 'Bollywood Bappa',
  type: 'playlist',
  image: 'https://c.saavncdn.com/editorial/image_150x150.jpg',
};

describe('Jiosaavn link parser', () => {
  it('extracts song, album, artist, and playlist ids', () => {
    expect(getSearchParser(SONG_LINK)).toMatchObject({
      type: Parser.Jiosaavn,
      id: 'AgIAQyBeWlI',
    });
    expect(getSearchParser(ALBUM_LINK)).toMatchObject({
      type: Parser.Jiosaavn,
      id: 'xq4v9ZFC9iA_',
    });
    expect(getSearchParser(ARTIST_LINK)).toMatchObject({
      type: Parser.Jiosaavn,
      id: 'LlRWpHzy3Hk_',
    });
    expect(getSearchParser(PLAYLIST_LINK)).toMatchObject({
      type: Parser.Jiosaavn,
      id: 'B6QQ8fKsUOQ_',
    });
    expect(getSearchParser(PLAYLIST_KIND_LINK)).toMatchObject({
      type: Parser.Jiosaavn,
      id: 'B6QQ8fKsUOQ_',
    });
    expect(getSearchParser(SONG_LINK + '/')).toMatchObject({
      type: Parser.Jiosaavn,
      id: 'AgIAQyBeWlI',
    });
  });

  it('leaves other services and bad kinds alone', () => {
    expect(
      getSearchParser('https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384').type
    ).toBe(Parser.Spotify);
    expect(() =>
      getSearchParser('https://www.jiosaavn.com/video/kesariya/AgIAQyBeWlI')
    ).toThrow();
  });
});

describe('Jiosaavn metadata', () => {
  let httpMock: HttpMock;

  beforeAll(() => {
    httpMock = new HttpMock();
  });

  afterAll(() => {
    cacheStore.reset();
    httpMock.restore();
  });

  it('parses song details with a preview', async () => {
    httpMock.onGet('token=AgIAQyBeWlI&type=song').reply(200, songDetails);

    const metadata = await getJiosaavnMetadata('AgIAQyBeWlI', SONG_LINK);

    expect(metadata).toEqual({
      title: 'Kesariya Pritam, Arijit Singh, Amitabh Bhattacharya',
      description: 'Brahmastra',
      type: MetadataType.Song,
      image: 'https://c.saavncdn.com/871/image-150x150.jpg',
      audio: 'https://preview.saavncdn.com/871/preview_96_p.mp4',
    });
    expect(getJiosaavnQueryFromMetadata(metadata)).toBe(
      'Kesariya Pritam, Arijit Singh, Amitabh Bhattacharya'
    );
    httpMock.reset();
  });

  it('parses album details', async () => {
    httpMock.onGet('token=xq4v9ZFC9iA_&type=album').reply(200, albumDetails);

    const metadata = await getJiosaavnMetadata('xq4v9ZFC9iA_', ALBUM_LINK);

    expect(metadata).toEqual({
      title: 'Brahmastra Pritam, Amitabh Bhattacharya',
      description: 'Pritam, Amitabh Bhattacharya',
      type: MetadataType.Album,
      image: 'https://c.saavncdn.com/871/image-150x150.jpg',
    });
    httpMock.reset();
  });

  it('parses artist details', async () => {
    httpMock.onGet('token=LlRWpHzy3Hk_&type=artist').reply(200, artistDetails);

    const metadata = await getJiosaavnMetadata('LlRWpHzy3Hk_', ARTIST_LINK);

    expect(metadata).toEqual({
      title: 'Arijit Singh',
      description: 'Arijit Singh',
      type: MetadataType.Artist,
      image: 'https://c.saavncdn.com/artists/image_150x150.jpg',
    });
    httpMock.reset();
  });

  it('parses playlist details', async () => {
    httpMock.onGet('token=B6QQ8fKsUOQ_&type=playlist').reply(200, playlistDetails);

    const metadata = await getJiosaavnMetadata('B6QQ8fKsUOQ_', PLAYLIST_LINK);

    expect(metadata).toEqual({
      title: 'Bollywood Bappa',
      description: 'Bollywood Bappa',
      type: MetadataType.Playlist,
      image: 'https://c.saavncdn.com/editorial/image_150x150.jpg',
    });
    httpMock.reset();
  });
});
