import Nano, { Fragment } from 'nano-jsx';

import { ghostButtonClass, primaryButtonClass } from '../components/button';
import Footer from '../components/footer';
import GateModal from '../components/gate';
import LoadingIndicator from '../components/loading-indicator';

const SAMPLE_LINK = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

export default function Home({
  source,
  children,
  gate,
  hero,
}: {
  source?: string;
  children?: typeof Fragment;
  gate?: { enabled: boolean; authenticated: boolean };
  hero?: boolean;
}) {
  const gated = gate?.enabled === true && gate.authenticated !== true;
  // Google pattern: centered hero until there is something to show, then a
  // compact top header. The server owns the starting state; a submit action
  // compacts the hero before the request lands.
  // nano-jsx hands empty children as a truthy empty array, so test for
  // rendered content, not mere presence.
  const hasContent = Array.isArray(children)
    ? children.some(child => child !== null && child !== undefined && child !== false)
    : Boolean(children);
  const isHero = hero ?? !hasContent;
  return (
    <div class="flex min-h-svh flex-col gap-2 p-2">
      <LoadingIndicator />
      <main
        id="home-main"
        data-controller="home"
        data-home-sample-link-value={SAMPLE_LINK}
        class={`flex flex-1 flex-col items-center ${isHero ? 'home-hero justify-center' : 'has-results justify-start'}`}
      >
        <div
          class={`flex flex-col gap-4 p-2 text-center ${isHero ? 'mb-2 mt-0' : 'mb-4 mt-8 sm:mt-12'}`}
        >
          <a href="/">
            <h1 class="home-title text-4xl uppercase md:text-5xl lg:text-6xl">
              I Don't Have Spotify
            </h1>
          </a>
          <p class="mx-auto max-w-2xl text-center text-sm text-zinc-400 lg:text-base">
            Paste a link from Spotify, YouTube Music, Apple Music, Deezer, SoundCloud, Qobuz, Bandcamp, Pandora, or Tidal to start.
          </p>
        </div>
        <div class="my-4 flex w-full flex-col items-center gap-4">
          {!gated && (
          <form
            data-home-target="form"
            data-action="submit->home#compact"
            hx-post="/search"
            hx-target="#search-results"
            hx-swap="innerHTML"
            hx-indicator="#loading-indicator, #search-skeleton"
            hx-config='{"timeout":6000}'
            class="flex w-full max-w-3xl items-center justify-center px-2"
          >
            <label for="song-link" class="sr-only">
              Search
            </label>
            <input
              id="song-link"
              data-home-target="link"
              type="text"
              name="link"
              class="min-h-[48px] flex-1 rounded-lg bg-zinc-700 p-2.5 text-base font-normal text-white placeholder:text-zinc-400"
              placeholder="https://open.spotify.com/track/7A8MwSsu9efJXP6xvZfRN3?si=d4f1e2eb324c43df"
              value={source}
            />
            <button
              type="submit"
              aria-label="Search"
              class={`ml-2 ${primaryButtonClass} flex min-w-[48px] items-center justify-center`}
            >
              <i class="ti ti-search p-1" />
            </button>
          </form>
          )}
          {isHero && !gated && (
            <button
              type="button"
              data-home-target="sample"
              data-action="click->home#trySample"
              class={ghostButtonClass}
            >
              Try a sample track
            </button>
          )}
          <div id="search-results">{children}</div>
          <div
            id="search-skeleton"
            aria-hidden="true"
            class="hidden w-full max-w-3xl flex-col gap-4 p-2"
          >
            <div class="flex items-center gap-4">
              <div class="h-24 w-24 rounded-lg bg-zinc-800 motion-safe:animate-pulse md:h-28 md:w-28" />
              <div class="flex flex-1 flex-col gap-2">
                <div class="h-5 w-3/4 rounded bg-zinc-800 motion-safe:animate-pulse" />
                <div class="h-4 w-1/2 rounded bg-zinc-800 motion-safe:animate-pulse" />
                <div class="mt-1 h-8 w-32 rounded-lg bg-zinc-800 motion-safe:animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      {gated && <GateModal />}
    </div>
  );
}
