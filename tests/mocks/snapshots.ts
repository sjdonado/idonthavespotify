import * as path from 'node:path';

import { existsSync, readFileSync } from 'fs';

export type SnapshotTarget = {
  url: string;
  file: string;
  staticBody?: string;
};

export const headSnapshotTargets = {
  spotifyTrackRollingStone: {
    url: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
    file: 'tests/mocks/head/spotify-track-3AhXZa8sUQht0UEdBJgpGc.html',
  },
  spotifyAlbumStories: {
    url: 'https://open.spotify.com/album/7dqftJ3kas6D0VAdmt3k3V',
    file: 'tests/mocks/head/spotify-album-7dqftJ3kas6D0VAdmt3k3V.html',
  },
  spotifyArtistJCole: {
    url: 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5',
    file: 'tests/mocks/head/spotify-artist-6l3HvQ5sa6mXTsMTB19rO5.html',
  },
  spotifyPlaylistBadBunny: {
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ',
    file: 'tests/mocks/head/spotify-playlist-37i9dQZF1DX2apWzyECwyZ.html',
  },
  spotifyEpisodeTerceraVuelta: {
    url: 'https://open.spotify.com/episode/2uvOfpJRRliCWpbiCXKf4Q',
    file: 'tests/mocks/head/spotify-episode-2uvOfpJRRliCWpbiCXKf4Q.html',
  },
  spotifyEpisodeWaveform: {
    url: 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT',
    file: 'tests/mocks/head/spotify-episode-43TCrgmP23qkLcAXZQN8qT.html',
  },
} as const satisfies Record<string, SnapshotTarget>;

export const searchSnapshotTargets = {
  soundCloudRollingStone: {
    url: 'https://soundcloud.com/search?q=Like%20a%20Rolling%20Stone%20Bob%20Dylan',
    file: 'tests/mocks/search/soundcloud-like-a-rolling-stone-bob-dylan.html',
  },
  soundCloudStoriesAvicii: {
    url: 'https://soundcloud.com/search?q=Stories%20Avicii',
    file: 'tests/mocks/search/soundcloud-stories-avicii.html',
  },
  soundCloudJCole: {
    url: 'https://soundcloud.com/search?q=J.%20Cole',
    file: 'tests/mocks/search/soundcloud-j-cole.html',
  },
  soundCloudThisIsBadBunny: {
    url: 'https://soundcloud.com/search?q=This%20Is%20Bad%20Bunny',
    file: 'tests/mocks/search/soundcloud-this-is-bad-bunny.html',
  },
  soundCloudTerceraVuelta: {
    url: 'https://soundcloud.com/search?q=%C2%BFD%C3%B3nde%20estabas%20el%206%20de%20noviembre%20del%20a%C3%B1o%201985%3F',
    file: 'tests/mocks/search/soundcloud-donde-estabas-1985.html',
  },
  soundCloudWaveformEndOfTwitter: {
    url: 'https://soundcloud.com/search?q=The%20End%20of%20Twitter%20as%20We%20Know%20It',
    file: 'tests/mocks/search/soundcloud-the-end-of-twitter-as-we-know-it.html',
  },
  appleMusicRollingStone: {
    url: 'https://music.apple.com/ca/search?term=Like%20a%20Rolling%20Stone%20Bob%20Dylan',
    file: 'tests/mocks/search/applemusic-like-a-rolling-stone.html',
  },
  appleMusicStories: {
    url: 'https://music.apple.com/ca/search?term=Stories%20Avicii',
    file: 'tests/mocks/search/applemusic-stories-avicii.html',
  },
  appleMusicJCole: {
    url: 'https://music.apple.com/ca/search?term=J%20Cole',
    file: 'tests/mocks/search/applemusic-j-cole.html',
  },
  appleMusicBadBunnyPlaylist: {
    url: 'https://music.apple.com/ca/search?term=This%20Is%20Bad%20Bunny',
    file: 'tests/mocks/search/applemusic-bad-bunny-playlist.html',
  },
  deezerRollingStone: {
    url: 'https://api.deezer.com/search/track?q=Like%20a%20Rolling%20Stone%20Bob%20Dylan&limit=4',
    file: 'tests/mocks/search/deezer-like-a-rolling-stone.json',
  },
  deezerStories: {
    url: 'https://api.deezer.com/search/album?q=Stories%20Avicii&limit=4',
    file: 'tests/mocks/search/deezer-stories-avicii.json',
  },
  deezerJCole: {
    url: 'https://api.deezer.com/search/artist?q=J%20Cole&limit=4',
    file: 'tests/mocks/search/deezer-j-cole.json',
  },
  deezerBadBunnyPlaylist: {
    url: 'https://api.deezer.com/search/playlist?q=This%20Is%20Bad%20Bunny&limit=4',
    file: 'tests/mocks/search/deezer-bad-bunny-playlist.json',
  },
  youtubeMusicRollingStone: {
    url: 'https://music.youtube.com/search?q=Like%20a%20Rolling%20Stone%20Bob%20Dylan',
    file: 'tests/mocks/search/youtubemusic-like-a-rolling-stone.html',
  },
  youtubeDataEmpty: {
    url: 'https://youtube.googleapis.com/mock',
    file: 'tests/mocks/search/youtube-empty.json',
    staticBody: JSON.stringify({ items: [] }),
  },
} as const satisfies Record<string, SnapshotTarget>;

export const allSnapshotTargets = {
  ...headSnapshotTargets,
  ...searchSnapshotTargets,
} as const satisfies Record<string, SnapshotTarget>;

export const loadSnapshotsFromDisk = <T extends Record<string, SnapshotTarget>>(
  targets: T
) =>
  Object.fromEntries(
    Object.entries(targets).map(([key, target]) => {
      const snapshotPath = path.resolve(process.cwd(), target.file);
      if (!existsSync(snapshotPath)) {
        throw new Error(
          `Snapshot missing: ${snapshotPath}. Run "bun run test:mocks:fetch".`
        );
      }
      const snapshot = readFileSync(snapshotPath, 'utf8');
      return [key, snapshot];
    })
  ) as { [K in keyof T]: string };

export const loadHeadSnapshots = () => loadSnapshotsFromDisk(headSnapshotTargets);
export const loadSearchSnapshots = () => loadSnapshotsFromDisk(searchSnapshotTargets);
