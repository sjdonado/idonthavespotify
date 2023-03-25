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
    <div class="bg-black text-white h-screen overflow-auto p-4">
      <main class="flex flex-col justify-start items-center h-[96%]">
        <div class="text-center my-16">
          <h1 class="text-6xl uppercase">I don't have spotify</h1>
          <h2 class="mt-6">Convert Spotify links to YouTube, Apple Music, Tidal, Soundcloud and more.</h2>
        </div>
        <SearchBar onSearch={handleOnSearch} isLoading={loading()} />
        {loading() && <p class="mt-8">Loading...</p>}
        {error() && <p class="mt-8">{error()}</p>}
        {!loading() && !error() && song() && <SongCard song={song()!} />}
      </main>
      <footer class="text-center">
        <p class="text-sm">{'Made with ❤️ by '}
          <a
            href="https://sjdonado.de"
            class="text-green-500 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Juan Rodriguez
          </a>
        </p>
      </footer>
    </div>
  );
}
