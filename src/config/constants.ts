export const SPOTIFY_LINK_REGEX =
  /^https:\/\/(open\.spotify\.com\/(track|album|playlist|artist|episode|show)|spotify\.link)\/(\w{11,24})(?:[\?#].*)?$/;

export const SPOTIFY_LINK_MOBILE_REGEX = /^https:\/\/spotify\.link\/(\w+)/;
export const SPOTIFY_LINK_DESKTOP_REGEX =
  /(https:\/\/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/(\w+))/;

export const YOUTUBE_LINK_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be|music\.youtube\.com)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?(?:\S+\?v=)?(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?(?:\S+\?v=)?(?:embed\/|\/)*([\w-]{11})(?:\S+)?/;

export const ADAPTERS_QUERY_LIMIT = 1;
export const RESPONSE_COMPARE_MIN_SCORE = 0.4;

export const DEFAULT_TIMEOUT = 6000;
