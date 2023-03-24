import server$ from 'solid-start/server';

const YOUTUBE_API_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_BASE_URL = 'https://www.youtube.com/watch';
const { VITE_YOUTUBE_API_KEY } = import.meta.env;

interface YoutubeSearchListResponse {
  error?: { message: string };
  items: [{ id: { videoId: string } }];
}

export default server$(async (title: string, description: string) => {
  const query = encodeURIComponent(`${title} ${description.includes('Song') ? description : ''}`);

  const url = `${YOUTUBE_API_SEARCH_URL}?q=${query}&maxResults=1&key=${VITE_YOUTUBE_API_KEY as string}`;

  const response = await fetch(url).then((res) => res.json()) as YoutubeSearchListResponse;

  if (response.error) {
    throw new Error(response.error.message);
  }

  const { videoId } = response.items[0].id;

  return `${YOUTUBE_BASE_URL}?v=${videoId}`;
});
