import Nano from 'nano-jsx';

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
};

export default function SearchCard(props: { searchResult: SearchResult }) {
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
        {props.searchResult.links.length === 0 && (
          <p class="w-full text-center text-sm md:text-start text-zinc-400">
            Not available on other platforms.
          </p>
        )}
        {props.searchResult.links.length > 0 && (
          <ul class="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
            {props.searchResult.links.map(({ type, url, isVerified, notAvailable }) => {
              const searchResult = SEARCH_LINK_DICT[type];
              const shortLabel = searchResult.label.replace('Listen on ', '');
              return (
                <li
                  data-controller="search-link"
                  data-search-link-url-value={url}
                  class={`flex min-h-[56px] items-center gap-1 rounded-xl bg-zinc-900 py-1 pl-3 pr-1 ${notAvailable ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <a
                    href={notAvailable ? undefined : url}
                    target={notAvailable ? undefined : '_blank'}
                    rel={notAvailable ? undefined : 'noreferrer'}
                    tabindex={notAvailable ? '-1' : undefined}
                    aria-disabled={notAvailable ? 'true' : undefined}
                    aria-label={searchResult.label}
                    title={notAvailable ? `${shortLabel} (not available)` : shortLabel}
                    class="flex min-w-0 flex-1 items-center"
                  >
                    <i class={`${searchResult.icon} shrink-0 text-xl`} />
                    <span class="ml-2 truncate text-sm">{shortLabel}</span>
                    {isVerified && (
                      <span
                        class="ml-1 inline-flex shrink-0 items-center justify-center rounded-full bg-green-500 p-1 text-[0.56rem] text-black"
                        aria-label="Verified"
                      >
                        <i class="ti ti-check" />
                      </span>
                    )}
                  </a>
                  {notAvailable ? (
                    <span class="mr-2 shrink-0 text-xs text-zinc-400" aria-label="Not available">
                      N/A
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-action="search-link#share"
                      aria-label={`Copy ${shortLabel} link`}
                      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus:outline-none focus:ring-1 focus:ring-white"
                    >
                      <i class="ti ti-copy" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
