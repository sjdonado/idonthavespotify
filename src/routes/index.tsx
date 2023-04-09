import { useSearchParams } from 'solid-start';
import { createSignal, onMount } from 'solid-js';

import type { SpotifyContent } from '~/@types/global';

import SearchBar, { SearchForm } from '~/components/SearchBar';
import SearchCard from '~/components/SearchCard';

import { fetchSpotifyContent, fetchSpotifyContentFromCache } from '~/server/rpc/spotifyContent';
import fetchSearchCount from '~/server/rpc/searchCount';

import { SPOTIFY_LINK_REGEX } from '~/constants';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams<{ id?: string }>();

  const [spotifyContent, setSpotifyContent] = createSignal<SpotifyContent | undefined>();
  const [searchCount, setSearchCount] = createSignal(0);

  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();

  const getSpotifyLinkFromClipboard = async () => {
    const clipboardText = await navigator.clipboard.readText();

    if (!SPOTIFY_LINK_REGEX.test(clipboardText)) {
      return undefined;
    }

    return clipboardText;
  };

  const handleOnSearch = async (formData: SearchForm) => {
    setLoading(true);

    try {
      const response = await fetchSpotifyContent(formData.spotifyLink);

      setSpotifyContent(response);
      setSearchParams({ id: response.id });
      setSearchCount(searchCount() + 1);
    } catch (err) {
      console.error((err as Error).message);
      setError('Something went wrong, try again later');
    }

    setLoading(false);
  };

  onMount(async () => {
    const count = await fetchSearchCount();
    setSearchCount(count);

    const spotifyLink = await getSpotifyLinkFromClipboard();

    if (spotifyLink) {
      await handleOnSearch({ spotifyLink });
      return;
    }

    if (searchParams.id) {
      const cachedSpotifyContent = await fetchSpotifyContentFromCache(searchParams.id);

      if (cachedSpotifyContent) {
        setSpotifyContent(cachedSpotifyContent);
      }
    }
  });

  return (
    <div class="bg-black text-white flex flex-col h-screen overflow-auto p-4">
      <main class="flex-1 flex flex-col justify-start items-center">
        <div class="text-center my-8 sm:my-16">
          <h1 class="text-6xl uppercase">I don't have Spotify</h1>
          <h2 class="mt-6">Paste a Spotify link and get the content on other platforms.</h2>
        </div>
        <SearchBar
          onSearch={handleOnSearch}
          isLoading={loading()}
          spotifyLink={spotifyContent() ? spotifyContent()!.source : undefined}
        />
        {loading() && <p class="mt-8">Loading...</p>}
        {error() && <p class="mt-8">{error()}</p>}
        {!loading() && !error() && spotifyContent() && (
          <SearchCard spotifyContent={spotifyContent()!} />
        )}
      </main>
      <footer class="text-center">
        <p>{'Queries performed: '}
          <span class="font-bold" data-testid="search-count">{searchCount()}</span>
        </p>
        <p class="flex flex-wrap justify-center items-center w-1/2 m-auto text-sm">
          <a
            href="https://raycast.com/sjdonado/idonthavespotify"
            class="flex justify-center text-green-500 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.703 9.92v1.377L1.402 7.995l.691-.686 2.61 2.611Zm1.377 1.377H4.703l3.301 3.301.69-.688-2.614-2.613Zm7.83-2.61L14.598 8 8.002 1.401l-.688.688L9.92 4.7H8.344l-1.82-1.818-.688.688 1.133 1.133H6.18v5.12h5.12V9.03l1.133 1.133.689-.688L11.3 7.654V6.078l2.61 2.61ZM5.047 4.356l-.688.688.739.739.688-.69-.739-.737Zm5.86 5.858-.687.688.739.739.688-.69-.74-.737ZM3.57 5.833l-.69.689 1.822 1.82V6.966L3.571 5.833Zm5.464 5.464H7.657l1.821 1.821.689-.689-1.132-1.132Z" fill="currentColor" /></svg>
            <span>Raycast Extension</span>
          </a>
          <span class="text-gray-500 mx-2 hidden sm:block">|</span>
          <a
            href="https://github.com/sjdonado/idonthavespotify"
            class="text-green-500 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            <i class="fab fa-github mr-2" />
            View on Github
          </a>
        </p>
      </footer>
    </div>
  );
}
