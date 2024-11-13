import { Html } from '@elysiajs/html';

import { Adapter } from '~/config/enum';
import { SearchResult } from '~/services/search';

const SEARCH_LINK_DICT = {
  [Adapter.Spotify]: {
    icon: 'fab fa-spotify',
    label: 'Listen on Spotify',
  },
  [Adapter.YouTube]: {
    icon: 'fab fa-youtube',
    label: 'Listen on YouTube Music',
  },
  [Adapter.Deezer]: {
    icon: 'fab fa-deezer',
    label: 'Listen on Deezer',
  },
  [Adapter.AppleMusic]: {
    icon: 'fab fa-apple',
    label: 'Listen on Apple Music',
  },
  [Adapter.Tidal]: {
    icon: 'fa fa-music',
    label: 'Listen on Tidal',
  },
  [Adapter.SoundCloud]: {
    icon: 'fab fa-soundcloud',
    label: 'Listen on SoundCloud',
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
        <img
          class="w-24 max-w-24 rounded-lg md:w-28"
          src={props.searchResult.image}
          alt={props.searchResult.title}
        />
        <div class="flex flex-col gap-1">
          <h3 class="hyphens-auto text-lg font-normal md:text-start md:text-2xl">
            {props.searchResult.title}
          </h3>
          <p class="text-sm text-zinc-400">{props.searchResult.description}</p>
          <div class="mt-2 flex gap-2">
            {props.searchResult.audio && (
              <button
                data-action="search-card#toggleAudio"
                type="button"
                class="relative flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-3 py-1 text-sm font-semibold"
              >
                <i data-search-card-target="icon" class="fas fa-play w-3" />
                Audio Preview
                <div class="absolute bottom-0 left-0 mx-[0.3rem] my-[0.01rem] hidden h-[0.15rem] w-[93%] rounded-lg bg-zinc-600 duration-300 ease-in-out">
                  <div
                    data-search-card-target="audioProgress"
                    class="h-full rounded-lg bg-white"
                    style={{ width: '0%' }}
                  ></div>
                </div>
              </button>
            )}
            <button
              data-action="search-card#share"
              type="button"
              class="flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-3 py-1 text-sm font-semibold"
            >
              <i class="fas fa-arrow-up-from-bracket" />
              Share
            </button>
          </div>
        </div>
      </div>
      <div class="mt-2 flex min-h-12 flex-1 flex-col items-start p-2">
        {props.searchResult.links.length === 0 && (
          <p class="w-full text-center text-sm md:text-start">
            Not available on other platforms
          </p>
        )}
        {props.searchResult.links.length > 0 && (
          <ul class="w-full">
            {props.searchResult.links.map(({ type, url, isVerified }) => {
              const searchResult = SEARCH_LINK_DICT[type];
              return (
                <li
                  data-controller="search-link"
                  data-search-link-url-value={url}
                  class="flex items-center justify-between gap-1 rounded-lg p-2 hover:bg-zinc-700"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={searchResult.label}
                    class="flex items-center"
                  >
                    <i class={`${searchResult.icon} w-8`} />
                    <p class="underline decoration-0 underline-offset-2">
                      {searchResult.label}
                    </p>
                    {isVerified && (
                      <span
                        class="ml-1 inline-flex items-center justify-center rounded-full bg-green-500 p-1 text-[0.56rem] text-black"
                        aria-label="Verified"
                      >
                        <i class="fas fa-check" />
                      </span>
                    )}
                  </a>
                  <button type="button" data-action="search-link#share">
                    <i class="fa fa-regular fa-copy px-2" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
