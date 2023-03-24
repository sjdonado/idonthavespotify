import { createSignal } from 'solid-js';

import SearchBar, { SearchForm } from '~/components/SearchBar';
import SongCard, { Song } from '~/components/SongCard';

import spotifyService from '~/services/spotify';
import youtubeService from '~/services/youtube';
import appleMusicService from '~/services/appleMusic';

export default function Home() {
  const [song, setSong] = createSignal<Song | undefined>();
  const [loading, setLoading] = createSignal(false);

  const handleOnSearch = async (formData: SearchForm) => {
    setLoading(true);

    const { title, description, image } = await spotifyService(formData.songLink);

    const youtubeLink = await youtubeService(title, description);
    const appleMusicLink = appleMusicService(title);

    const searchedSong = {
      title,
      description,
      image,
      links: {
        youtube: youtubeLink,
        appleMusic: appleMusicLink,
      },
    } as Song;

    setSong(searchedSong);
    setLoading(false);
  };

  return (
    <main class="bg-gray-900 text-white font-thin flex flex-col justify-start items-center p-4 h-screen overflow-auto">
      <h1 class="text-center max-6-xs text-6xl uppercase my-16">
        I don't have spotify
      </h1>
      <SearchBar onSearch={handleOnSearch} isLoading={loading()} />
      {loading() && <p class="mt-8">Loading...</p>}
      {song() && <SongCard song={song()!} />}
    </main>
  );
}
