import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { MetadataType, Parser } from '~/config/enum';
import { getDeezerMetadata, getDeezerQueryFromMetadata } from '~/parsers/deezer';
import { getSearchParser } from '~/parsers/link';
import { cacheStore } from '~/services/cache';

import { HttpMock } from '../utils/http-mock';

const SHOW_LINK = 'https://www.deezer.com/show/3955257';
const EPISODE_LINK = 'https://www.deezer.com/episode/406826407';

const showPage = `<html><head>
<meta property="og:title" content="This American Life" />
<meta property="og:description" content="alle Folgen an einem Ort" />
<meta property="og:type" content="show" />
<meta property="og:image" content="https://cdn-images.dzcdn.net/show.jpg" />
</head></html>`;

const episodePage = `<html><head>
<meta property="og:title" content="732: Secrets" />
<meta property="og:description" content="This American Life" />
<meta property="og:type" content="episode" />
<meta property="og:image" content="https://cdn-images.dzcdn.net/ep.jpg" />
</head></html>`;

describe('Deezer podcast input', () => {
  let httpMock: HttpMock;

  beforeAll(() => {
    httpMock = new HttpMock();
  });

  afterAll(() => {
    cacheStore.reset();
    httpMock.restore();
  });

  it('routes show and episode links to the Deezer parser', () => {
    expect(getSearchParser(SHOW_LINK)).toMatchObject({
      type: Parser.Deezer,
      id: '3955257',
    });
    expect(getSearchParser(EPISODE_LINK)).toMatchObject({
      type: Parser.Deezer,
      id: '406826407',
    });
  });

  it('parses show details', async () => {
    httpMock.onGet(SHOW_LINK).reply(200, showPage);

    const metadata = await getDeezerMetadata('3955257', SHOW_LINK);

    expect(metadata.type).toBe(MetadataType.Show);
    expect(metadata.title).toBe('This American Life');
    expect(getDeezerQueryFromMetadata(metadata)).toBe('This American Life');
    httpMock.reset();
  });

  it('parses episode details with the show name in the query', async () => {
    httpMock.onGet(EPISODE_LINK).reply(200, episodePage);

    const metadata = await getDeezerMetadata('406826407', EPISODE_LINK);

    expect(metadata.type).toBe(MetadataType.Podcast);
    expect(metadata.title).toBe('732: Secrets');
    expect(getDeezerQueryFromMetadata(metadata)).toContain('732: Secrets');
    expect(getDeezerQueryFromMetadata(metadata)).toContain('This American Life');
    httpMock.reset();
  });

  it('builds a query without a description', () => {
    const query = getDeezerQueryFromMetadata({
      title: '732: Secrets',
      description: undefined as unknown as string,
      type: MetadataType.Podcast,
    });

    expect(query).toContain('732: Secrets');
  });
});
