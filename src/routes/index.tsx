import { createSignal, onMount } from 'solid-js';
import { load, ReCaptchaInstance } from 'recaptcha-v3';

import SearchBar, { SearchForm } from '~/components/SearchBar';
import SongCard, { Song } from '~/components/SongCard';

import { fetchSong, fetchSearchCount } from '~/services/remote';

const { VITE_RECAPTCHA_SITE_KEY } = import.meta.env;

export default function Home() {
  const [recaptcha, setRecaptcha] = createSignal<ReCaptchaInstance>();

  const [song, setSong] = createSignal<Song | undefined>();
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();

  const [searchCount, setSearchCount] = createSignal(0);

  onMount(async () => {
    const [recaptchaInstance, count] = await Promise.all([
      load(VITE_RECAPTCHA_SITE_KEY),
      fetchSearchCount(),
    ]);

    setRecaptcha(recaptchaInstance);
    setSearchCount(count);
  });

  const handleOnSearch = async (formData: SearchForm) => {
    setLoading(true);

    try {
      const token = await recaptcha()!.execute('submit');
      const fetchedSong = await fetchSong(formData.songLink, token);

      setSong(fetchedSong);
      setSearchCount(searchCount() + 1);
    } catch (err) {
      setError('Something went wrong, try again later');
    }

    setLoading(false);
  };

  return (
    <div class="bg-black text-white h-screen overflow-auto p-4">
      <main class="flex flex-col justify-start items-center h-[95%]">
        <div class="text-center my-16">
          <h1 class="text-6xl uppercase">I don't have spotify</h1>
          <h2 class="mt-6">Find Spotify content on YouTube, Apple Music, Tidal, Soundcloud and more.</h2>
        </div>
        <SearchBar onSearch={handleOnSearch} isLoading={loading()} />
        {loading() && <p class="mt-8">Loading...</p>}
        {error() && <p class="mt-8">{error()}</p>}
        {!loading() && !error() && song() && <SongCard song={song()!} />}
      </main>
      <footer class="text-center">
        <p class="text-sm">{'Searches performed: '}
          <span class="font-bold">{searchCount()}</span>
        </p>
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
