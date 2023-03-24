const TIDAL_BASE_URL = 'https://listen.tidal.com/search?q=';

export default (title: string) => {
  const query = encodeURIComponent(`${title}`);
  const url = `${TIDAL_BASE_URL}${query}`;

  return url;
};
