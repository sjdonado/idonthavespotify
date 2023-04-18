import { useSearchParams } from 'solid-start';
import { createSignal, onMount } from 'solid-js';

import type { SpotifyContent } from '~/@types/global';

import SearchBar, { SearchForm } from '~/components/SearchBar';
import SearchCard from '~/components/SearchCard';

import { fetchSpotifyContent, fetchSpotifyContentFromCache } from '~/server/rpc/spotifyContent';
import fetchSearchCount from '~/server/rpc/searchCount';

import { SPOTIFY_LINK_REGEX } from '~/constants';
import Footer from '~/components/Footer';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams<{ id?: string }>();

  const [spotifyContent, setSpotifyContent] = createSignal<SpotifyContent | undefined>();
  const [searchCount, setSearchCount] = createSignal<number | undefined>();

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
      setSearchCount((searchCount() ?? 0) + 1);
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
    <div class="bg-black text-white flex flex-col h-screen overflow-auto p-2">
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
      < Footer searchCount={searchCount()} />
    </div>
  );
}
