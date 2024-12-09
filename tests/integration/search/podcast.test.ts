import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { app } from '~/index';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import youtubePodcastResponseMock from '../../fixtures/youtube/podcastResponseMock.json';
import { jsonRequest } from '../../utils/request';
import {
  API_SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getSoundCloudSearchLink,
  getYouTubeSearchLink,
  urlShortenerLink,
  urlShortenerResponseMock,
} from '../../utils/shared';

const [
  spotifyPodcastHeadResponseMock,
  appleMusicPodcastResponseMock,
  soundCloudPodcastResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/podcastHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/podcastResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/emptyResponseMock.html').text(),
]);

describe('GET /search - Podcast Episode', () => {
  let mock: AxiosMockAdapter;
  const getUniversalMetadataFromTidalMock = spyOn(
    tidalUniversalLinkParser,
    'getUniversalMetadataFromTidal'
  );

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  beforeEach(() => {
    getUniversalMetadataFromTidalMock.mockReset();
    mock.reset();
    cacheStore.reset();

    getUniversalMetadataFromTidalMock.mockResolvedValue(undefined);
    mock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);
  });

  it('should return 200', async () => {
    const link = 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT';
    const query = 'The End of Twitter as We Know It Waveform: The MKBHD Podcast';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Podcast);
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifyPodcastHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicPodcastResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubePodcastResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudPodcastResponseMock);
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: 'b3Blbi5zcG90aWZ5LmNvbS9lcGlzb2RlLzQzVENyZ21QMjNxa0xjQVhaUU44cVQ%3D',
      type: 'podcast',
      title: 'The End of Twitter as We Know It',
      description:
        'Listen to this episode from Waveform: The MKBHD Podcast on Spotify. So much happened this week! Not only did Twitter get renamed but Samsung Unpacked happened as well. First, Marques, Andrew, and David talk about base model pricing before talking all about Twitter getting renamed to X. Then they give their first impressions on the new Samsung products before we close it out with some trivia and tech show-and-tell too. Enjoy!  Links: Linus Base Models video: https://bit.ly/lttstartingprice Apple Insider Action Button article: https://bit.ly/appleinsiderrumors Lex Friedman interview with Zuck: https://bit.ly/lexvsmark  Shop products mentioned:  Google Pixel Fold at https://geni.us/zhOE5oh  Samsung Galaxy Z Fold 5 at https://geni.us/ofBYJ6J  Samsung Galaxy Z Flip 5 at https://geni.us/X7vim  Samsung Galaxy Tab S9 at https://geni.us/bBm1  Samsung Galaxy Watch 6 at https://geni.us/gOAk  Shop the merch: https://shop.mkbhd.com  Threads: Waveform: https://www.threads.net/@waveformpodcast Marques: https://www.threads.net/@mkbhd Andrew: https://www.threads.net/@andrew_manganelli David Imel: https://www.threads.net/@davidimel Adam: https:https://www.threads.net/@parmesanpapi17 Ellis: https://twitter.com/EllisRovin  Twitter: https://twitter.com/WVFRM  TikTok:  https://www.tiktok.com/@waveformpodcast  Join the Discord: https://discord.gg/mkbhd  Music by 20syl: https://bit.ly/2S53xlC  Waveform is part of the Vox Media Podcast Network. Learn more about your ad choices. Visit podcastchoices.com/adchoices',
      image: 'https://i.scdn.co/image/ab6765630000ba8aa05ac56dbc44378f45ef693a',
      audio:
        'https://podz-content.spotifycdn.com/audio/clips/0Dijh26Vc2UoFrsXfkACQ8/clip_2900584_2965529.mp3',
      source: 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT',
      universalLink: urlShortenerResponseMock.data.refer,
      links: [
        {
          type: 'youTube',
          url: 'https://music.youtube.com/podcast/0atwuUWhKWs',
          isVerified: true,
        },
      ],
    });

    expect(mock.history.get).toHaveLength(3);
  });
});
