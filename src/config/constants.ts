export const SPOTIFY_LINK_REGEX =
  /^https:\/\/(open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist|episode|show)|spotify\.link)\/(\w{11,24})(?:[\?#].*)?$/;

export const SPOTIFY_LINK_MOBILE_REGEX = /^https:\/\/spotify\.link\/(\w+)/;
export const SPOTIFY_LINK_DESKTOP_REGEX =
  /(https:\/\/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/(\w+))/;

export const YOUTUBE_LINK_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be|music\.youtube\.com)\/(?:watch\?v=|embed\/|v\/|shorts\/|playlist\?list=|channel\/)?([^&\s]{11,})/;

export const APPLE_MUSIC_LINK_REGEX =
  /^https:\/\/music\.apple\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:album|playlist|station|artist|music-video|video-playlist|show|song)\/([^/?]+)(?:\/([^/?]+))?(?:\?.*)?$/;

export const DEEZER_LINK_REGEX =
  /^https:\/\/www\.deezer\.com\/(?:[a-z]{2}\/)?(?:track|album|playlist|artist|episode|show)\/(\d+)/;

export const SOUNDCLOUD_LINK_REGEX =
  /^(?:https:\/\/soundcloud\.com\/([\w-]+)\/([\w-]+)(?:\/sets\/([\w-]+))?(?:[\?#].*)?|https:\/\/on\.soundcloud\.com\/([\w-]{8,}))$/;

export const TIDAL_LINK_REGEX =
  /^https:\/\/tidal\.com\/browse\/(track|artist|album|mix|video)\/([\w-]+)(?:\/[\w-]+)?(?:[\?#].*)?$/;

export const GOOGLE_LINK_REGEX =
  /^https:\/\/(?:www\.google\.com\/gasearch(?:[\?#].+)?|share\.google\/(.+))$/;

export const ALLOWED_LINKS_REGEX = `${SPOTIFY_LINK_REGEX.source}|${YOUTUBE_LINK_REGEX.source}|${APPLE_MUSIC_LINK_REGEX.source}|${DEEZER_LINK_REGEX.source}|${SOUNDCLOUD_LINK_REGEX.source}|${TIDAL_LINK_REGEX.source}|${GOOGLE_LINK_REGEX.source}`;

export const ADAPTERS_QUERY_LIMIT = 4;
export const RESPONSE_COMPARE_MIN_SCORE = 0.7;
export const RESPONSE_COMPARE_MIN_INCLUSION_SCORE = 0.3;

export const DEFAULT_TIMEOUT = 3000;
