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

function SearchLink(props: { type: Adapter; url: string; isVerified?: boolean }) {
  const searchResult = SEARCH_LINK_DICT[props.type];

  return (
    <li class="flex items-center justify-between gap-1 rounded-lg p-2 text-sm hover:bg-zinc-700 sm:text-base">
      <a
        href={props.url}
        target="_blank"
        rel="noreferrer"
        aria-label={searchResult.label}
        class="flex items-center"
      >
        <i class={`${searchResult.icon} w-8`} />
        <p class="underline decoration-0 underline-offset-2">{searchResult.label}</p>
        {props.isVerified && (
          <span
            class="ml-1 inline-flex items-center justify-center rounded-full bg-green-500 p-1 text-[0.56rem]"
            aria-label="Verified"
          >
            <i class="fas fa-check" />
          </span>
        )}
      </a>
      <button type="button" onclick={`copyLinkToClipboard('${props.url}')`}>
        <i class="fa fa-regular fa-copy" />
      </button>
    </li>
  );
}

export default function SearchCard(props: { searchResult: SearchResult }) {
  return (
    <div
      id="search-card"
      data-id={props.searchResult.id}
      class="relative m-4 flex flex-wrap items-start justify-center gap-4 rounded-lg shadow-lg md:p-4"
    >
      <div class="flex w-full items-center justify-start gap-4">
        <img
          class="w-28 rounded-lg"
          src={props.searchResult.image}
          alt={props.searchResult.title}
        />
        <div class="flex flex-col gap-1">
          <h3 class="hyphens-auto text-center text-2xl font-normal md:text-start">
            {props.searchResult.title}
          </h3>
          <p class="text-center text-sm text-zinc-400 md:text-start">
            {props.searchResult.description}
          </p>
          <div class="mt-2 flex">
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-3 py-1 text-sm font-semibold"
              onclick={`shareLink('${props.searchResult.universalLink}')`}
            >
              <i class="fas fa-arrow-up-from-bracket" />
              Share
            </button>
          </div>
        </div>
      </div>
      <div class="flex min-h-12 flex-1 flex-col items-start p-2">
        {props.searchResult.links.length === 0 && (
          <p class="w-full text-center text-sm md:text-start">
            Not available on other platforms
          </p>
        )}
        {props.searchResult.links.length > 0 && (
          <ul class="w-full">
            {props.searchResult.links.map(({ type, url, isVerified }) => (
              <SearchLink type={type} url={url} isVerified={isVerified} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
