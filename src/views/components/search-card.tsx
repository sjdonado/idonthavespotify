import Nano, { Fragment } from 'nano-jsx';

import { Adapter } from '~/config/enum';
import { type SearchResult } from '~/services/search';

const SEARCH_LINK_DICT = {
  [Adapter.Spotify]: {
    icon: 'ti ti-brand-spotify',
    label: 'Listen on Spotify',
  },
  [Adapter.YouTube]: {
    icon: 'ti ti-brand-youtube-filled',
    label: 'Listen on YouTube Music',
  },
  [Adapter.Deezer]: {
    icon: 'ti ti-brand-deezer',
    label: 'Listen on Deezer',
  },
  [Adapter.AppleMusic]: {
    icon: 'ti ti-brand-apple-filled',
    label: 'Listen on Apple Music',
  },
  [Adapter.Tidal]: {
    icon: 'ti ti-brand-tidal',
    label: 'Listen on Tidal',
  },
  [Adapter.SoundCloud]: {
    icon: 'ti ti-brand-soundcloud',
    label: 'Listen on SoundCloud',
  },
  [Adapter.Qobuz]: {
    icon: 'custom-svg svg-brand-qobuz',
    label: 'Listen on Qobuz',
  },
  [Adapter.Bandcamp]: {
    icon: 'ti ti-brand-bandcamp',
    label: 'Listen on Bandcamp',
  },
  [Adapter.Pandora]: {
    icon: 'custom-svg svg-brand-pandora',
    label: 'Listen on Pandora',
  },
  [Adapter.Jiosaavn]: {
    icon: 'ti ti-music',
    label: 'Listen on JioSaavn',
  },
  [Adapter.ApplePodcasts]: {
    icon: 'ti ti-podcast',
    label: 'Listen on Apple Podcasts',
  },
  [Adapter.PodcastFeed]: {
    icon: 'ti ti-rss',
    label: 'RSS Feed',
  },
  [Adapter.Invidious]: {
    icon: 'ti ti-shield-lock',
    label: 'Listen on Invidious',
  },
};

export default function SearchCard(props: { searchResult: SearchResult; pending?: boolean }) {
  return (
    <div
      data-controller="search-card"
      data-search-card-id-value={props.searchResult.id}
      data-search-card-universal-link-value={props.searchResult.universalLink}
      data-search-card-audio-value={props.searchResult.audio}
      class="relative m-4 flex max-w-3xl flex-wrap items-start justify-center gap-4 rounded-lg shadow-lg md:p-4"
    >
      <div class="flex w-full items-center justify-start gap-4">
        {props.searchResult.image && (
          <img
            class="w-24 max-w-24 rounded-lg md:w-28"
            src={props.searchResult.image}
            alt={props.searchResult.title}
          />
        )}
        <div class="flex flex-col gap-1">
          <h3
            title={props.searchResult.title}
            class="hyphens-auto text-lg font-normal line-clamp-2 md:text-start md:text-2xl"
          >
            {props.searchResult.title}
          </h3>
          <p title={props.searchResult.description} class="text-sm text-zinc-400 line-clamp-2">
            {props.searchResult.description}
          </p>
          <div class="mt-2 flex gap-2">
            {props.searchResult.audio && (
              <button
                data-action="search-card#toggleAudio"
                type="button"
                aria-label="Play preview"
                class="relative flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-white"
              >
                <svg viewBox="0 0 48 48" aria-hidden="true" class="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#3f3f46" stroke-width="3" />
                  <circle
                    data-search-card-target="audioProgress"
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#22c55e"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-dasharray="125.66"
                    stroke-dashoffset="125.66"
                  />
                </svg>
                <i data-search-card-target="icon" class="ti ti-player-play-filled" />
              </button>
            )}
            <button
              data-action="search-card#share"
              type="button"
              class="flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-3 py-1 text-sm font-semibold"
            >
              <i class="ti ti-share-2" />
              Share
            </button>
          </div>
        </div>
      </div>
      <div class="mt-2 flex min-h-12 flex-1 flex-col items-start p-2">
        {props.pending ? (
          <div
            hx-get={`/?id=${props.searchResult.id}&rows=1`}
            hx-trigger="load"
            hx-target="this"
            hx-swap="outerHTML"
            hx-config='{"timeout":15000}'
            {...{ 'hx-status:4xx': 'swap:none', 'hx-status:5xx': 'swap:none' }}
            data-search-rows-loader
            role="status"
            aria-label="Loading links"
            // Reserve the usual rows' height (about 11 rows: 6 lines of two
            // on phones, 4 of three from sm up) so the page does not jump.
            class="flex min-h-[23.5rem] w-full items-center justify-center sm:min-h-[15.5rem]"
          >
            <div class="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500 motion-reduce:animate-none" />
            <span class="sr-only">Loading links…</span>
            <noscript>
              <a href={`/?id=${props.searchResult.id}&rows=1`} class="text-sm underline">
                Show the other platforms
              </a>
            </noscript>
          </div>
        ) : (
          <SearchLinks links={props.searchResult.links} />
        )}
      </div>
    </div>
  );
}

// The service rows, also served alone (`/?id=<id>&rows=1`) to the share
// page's loader.
export function SearchLinks(props: { links: SearchResult['links'] }) {
  return (
    <Fragment>
        {props.links.length === 0 && (
          <p class="w-full text-center text-sm md:text-start text-zinc-400">
            Not available on other platforms.
          </p>
        )}
        {props.links.length > 0 && (
          <ul class="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
            {props.links.map(({ type, url, isVerified, notAvailable }) => {
              const searchResult = SEARCH_LINK_DICT[type];
              const shortLabel = searchResult.label.replace('Listen on ', '');
              return (
                <li
                  data-search-link
                  class={`flex min-h-[56px] items-center gap-1 rounded-xl border bg-zinc-900 px-3 py-1 ${isVerified ? 'border-transparent' : 'border-dotted border-zinc-500'} ${notAvailable ? 'pointer-events-none opacity-60' : ''}`}
                >
                  {notAvailable ? (
                    <span
                      aria-label={`${shortLabel} (not available)`}
                      title={`${shortLabel} (not available)`}
                      class="flex min-w-0 flex-1 items-center"
                    >
                      <i class={`${searchResult.icon} shrink-0 text-xl`} />
                      <span class="ml-2 truncate text-sm">{shortLabel}</span>
                    </span>
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={isVerified ? `${searchResult.label} (verified)` : `${searchResult.label} (unverified)`}
                      title={shortLabel}
                      class="-my-1 flex min-w-0 flex-1 items-center self-stretch rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
                    >
                      <i class={`${searchResult.icon} shrink-0 text-xl`} />
                      <span class="ml-2 truncate text-sm">{shortLabel}</span>
                    </a>
                  )}
                  {notAvailable && (
                    <span class="shrink-0 text-xs text-zinc-400" aria-label="Not available">
                      N/A
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
    </Fragment>
  );
}
