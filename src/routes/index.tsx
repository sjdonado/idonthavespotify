import { createSignal } from 'solid-js';

import SearchBar, { SearchForm } from '~/components/SearchBar';
import SongCard, { Song } from '~/components/SongCard';

import { fetchSong } from '~/services/remote';

export default function Home() {
  const [song, setSong] = createSignal<Song | undefined>();
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();

  const handleOnSearch = async (formData: SearchForm) => {
    setLoading(true);

    try {
      const fetchedSong = await fetchSong(formData.songLink);
      setSong(fetchedSong);
    } catch (err) {
      setError('Something went wrong, try again later');
    }

    setLoading(false);
  };

  return (
    <main class="bg-gray-900 text-white font-thin flex flex-col justify-start items-center p-4 h-screen overflow-auto">
      <h1 class="text-center max-6-xs text-6xl uppercase my-16">I don't have spotify</h1>
      <SearchBar onSearch={handleOnSearch} isLoading={loading()} />
      {loading() && <p class="mt-8">Loading...</p>}
      {error() && <p class="mt-8">{error()}</p>}
      {!loading() && !error() && song() && <SongCard song={song()!} />}
    </main>
  );
}
