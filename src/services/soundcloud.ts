const SOUNDCLOUD_BASE_URL = 'https://soundcloud.com/search/sounds?q=';

export default (title: string) => {
  const query = encodeURIComponent(`${title}`);
  const url = `${SOUNDCLOUD_BASE_URL}${query}`;

  return url;
};
