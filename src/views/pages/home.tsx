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
  // compact top header. The server owns the starting state; the client
  // compacts once a result swap lands (the swap covers only results).
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
        class={`flex flex-1 flex-col items-center ${isHero ? 'home-hero justify-center' : 'has-results'}`}
      >
        <div
          class={`flex flex-col gap-4 p-2 text-center ${isHero ? 'my-2' : 'mb-4 mt-8 sm:mt-12'}`}
        >
          <a href="/">
            <h1 class="home-title text-4xl uppercase md:text-5xl lg:text-6xl">
              I Don't Have Spotify
            </h1>
          </a>
          {isHero && (
          <p data-home-target="subtitle" class="mx-auto max-w-2xl text-center text-sm text-zinc-400 lg:text-base">
            Paste a link from Spotify, YouTube Music, Apple Music, Deezer, SoundCloud, Qobuz, Bandcamp, Pandora, or Tidal to start.
          </p>
          )}
        </div>
        <div class="my-4 flex w-full flex-col items-center gap-4">
          {!gated && (
          <form
            data-home-target="form"
            hx-post="/search"
            hx-target="#search-results"
            hx-swap="innerHTML"
            hx-indicator="#loading-indicator, #search-skeleton"
            {...{ 'hx-status:4xx': 'swap:none', 'hx-status:5xx': 'swap:none' }}
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
            role="status"
            aria-label="Searching"
            class="hidden min-h-[40vh] w-full max-w-3xl flex-col items-center justify-center gap-4 p-2"
          >
            <div class="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500 motion-reduce:animate-none" />
            <span class="sr-only">Searching…</span>
          </div>
        </div>
      </main>
      <Footer />
      {gated && <GateModal />}
    </div>
  );
}
