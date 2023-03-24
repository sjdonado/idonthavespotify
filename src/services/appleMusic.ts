const APPLE_MUSIC_BASE_URL = 'https://music.apple.com/search?term=';

export default (title: string) => {
  const query = encodeURIComponent(`${title}`);
  const url = `${APPLE_MUSIC_BASE_URL}${query}`;

  return url;
};
