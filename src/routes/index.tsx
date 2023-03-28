import { useSearchParams } from 'solid-start';
import { createSignal, onMount } from 'solid-js';

import { load, ReCaptchaInstance } from 'recaptcha-v3';

import type { SpotifyContent } from '~/@types/global';

import SearchBar, { SearchForm } from '~/components/SearchBar';
import SearchCard from '~/components/SearchCard';

import { fetchSpotifyContent, fetchSpotifyContentFromCache } from '~/server/rpc/spotifyContent';
import fetchSearchCount from '~/server/rpc/searchCount';

import * as ENV from '~/config/env/client';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams<{ id?: string }>();

  const [recaptcha, setRecaptcha] = createSignal<ReCaptchaInstance>();

  const [spotifyContent, setSpotifyContent] = createSignal<SpotifyContent | undefined>();
  const [searchCount, setSearchCount] = createSignal(0);

  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();

  onMount(async () => {
    const [recaptchaInstance, count] = await Promise.all([
      load(ENV.recaptcha.siteKey),
      fetchSearchCount(),
    ]);

    setRecaptcha(recaptchaInstance);
    setSearchCount(count);

    if (searchParams.id) {
      const spotifyContent = await fetchSpotifyContentFromCache(searchParams.id);

      if (spotifyContent) {
        setSpotifyContent(spotifyContent);
      }
    }
  });

  const handleOnSearch = async (formData: SearchForm) => {
    setLoading(true);

    try {
      const token = await recaptcha()!.execute('submit');
      const response = await fetchSpotifyContent(formData.spotifyLink, token);

      setSpotifyContent(response);
      setSearchParams({ id: response.id });
      setSearchCount(searchCount() + 1);
    } catch (err) {
      console.error((err as Error).message);
      setError('Something went wrong, try again later');
    }

    setLoading(false);
  };

  return (
    <div class="bg-black text-white flex flex-col h-screen overflow-auto p-4">
      <main class="flex-1 flex flex-col justify-start items-center">
        <div class="text-center my-8 sm:my-16">
          <h1 class="text-6xl uppercase">I don't have spotify</h1>
          <h2 class="mt-6">Find Spotify content on YouTube, Apple Music, Tidal, SoundCloud and more.</h2>
        </div>
        <SearchBar
          onSearch={handleOnSearch}
          isLoading={loading()}
          spotifyLink={spotifyContent() ? spotifyContent()!.source : undefined}
        />
        {loading() && <p class="mt-8">Loading...</p>}
        {error() && <p class="mt-8">{error()}</p>}
        {!loading() && !error() && spotifyContent() && <SearchCard spotifyContent={spotifyContent()!} />}
      </main>
      <footer class="text-center">
        <p class="text-sm">{'Queries performed: '}
          <span class="font-bold">{searchCount()}</span>
        </p>
        <p class="text-sm">
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
