export const SPOTIFY_LINK_REGEX =
  /^https:\/\/(open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist|episode|show)|spotify\.link)\/(\w{11,24})(?:[\?#].*)?$/;

export const SPOTIFY_LINK_MOBILE_REGEX = /^https:\/\/spotify\.link\/(\w+)/;
export const SPOTIFY_LINK_DESKTOP_REGEX =
  /(https:\/\/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/(\w+))/;

export const YOUTUBE_LINK_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be|music\.youtube\.com)\/(?:watch\?v=|embed\/|v\/|shorts\/|playlist\?list=|channel\/)?([\w-]{11,})(?:\S+)?(?:&si=\S+)?/;

export const APPLE_MUSIC_LINK_REGEX =
  /^https:\/\/music\.apple\.com\/(?:[a-z]{2}\/)?(?:album|playlist|station|artist|music-video|video-playlist|show)\/([\w-]+)(?:\/([\w-]+))?(?:\?i=(\d+))?(?:\?.*)?/;

export const DEEZER_LINK_REGEX =
  /^https:\/\/www\.deezer\.com\/(?:[a-z]{2}\/)?(?:track|album|playlist|artist|episode|show)\/(\d+)/;

export const SOUNDCLOUD_LINK_REGEX =
  /^https:\/\/soundcloud\.com\/([\w-]+)\/([\w-]+)(?:\/sets\/([\w-]+))?(?:[\?#].*)?/;

export const ALLOWED_LINKS_REGEX = `${SPOTIFY_LINK_REGEX.source}|${YOUTUBE_LINK_REGEX.source}|${APPLE_MUSIC_LINK_REGEX.source}|${DEEZER_LINK_REGEX.source}|${SOUNDCLOUD_LINK_REGEX.source}`;

export const ADAPTERS_QUERY_LIMIT = 1;
export const RESPONSE_COMPARE_MIN_SCORE = 0.4;

export const DEFAULT_TIMEOUT = 3000;
