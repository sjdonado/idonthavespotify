import { Component, For } from 'solid-js';

import { SpotifyContentLinkType, type SpotifyContent } from '~/@types/global';

import AudioPreview from './AudioPreview';

interface SearchCardProps {
  spotifyContent: SpotifyContent;
}

const SPOTIFY_CONTENT_LINK_DICT = {
  [SpotifyContentLinkType.Youtube]: {
    icon: 'fab fa-youtube',
    label: 'Listen on Youtube',
  },
  [SpotifyContentLinkType.Deezer]: {
    icon: 'fab fa-deezer',
    label: 'Listen on Deezer',
  },
  [SpotifyContentLinkType.AppleMusic]: {
    icon: 'fab fa-apple',
    label: 'Listen on Apple Music',
  },
  [SpotifyContentLinkType.Tidal]: {
    icon: 'fa fa-music',
    label: 'Listen on Tidal',
  },
  [SpotifyContentLinkType.SoundCloud]: {
    icon: 'fab fa-soundcloud',
    label: 'Listen on SoundCloud',
  },
};

const SpotifyContentLink = (props: {
  type: SpotifyContentLinkType,
  url: string,
  isVerified?: boolean,
}) => {
  const { label, icon } = SPOTIFY_CONTENT_LINK_DICT[props.type];

  return (
    <a
      href={props.url}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      class="flex items-center hover:text-gray-300 text-sm sm:text-base"
    >
      <i class={`${icon} w-6 mr-1`} />
      {label}
      {props.isVerified && (
        <span
          class="inline-flex items-center justify-center ml-1 p-1 rounded-full text-[0.56rem] bg-green-500"
          aria-label="Verified"
        >
          <i class="fas fa-check" />
        </span>
      )}
    </a>
  );
};

const SearchCard: Component<SearchCardProps> = (props) => (
  <div
    data-testid="search-card"
    class="flex flex-wrap justify-start items-center rounded-lg border border-white w-5/6 lg:w-1/2 m-5"
  >
    <AudioPreview
      title={props.spotifyContent.title}
      image={props.spotifyContent.image}
      audio={props.spotifyContent.audio}
    />
    <div class="flex flex-col items-start p-2 w-52 sm:w-2/3 truncate">
      <div class="font-bold text-xl">{props.spotifyContent.title}</div>
      <p class="text-sm">{props.spotifyContent.description}</p>
      {props.spotifyContent.links.length === 0 && (
        <p class="my-12 text-sm text-center w-full">No links found</p>
      )}
      {props.spotifyContent.links.length > 0 && (
        <ul class="mt-2 text-base">
          <li class="flex flex-col items-start">
            <For each={props.spotifyContent.links}>
              {({ type, url, isVerified }) => (
                <SpotifyContentLink
                  type={type}
                  url={url}
                  isVerified={isVerified}
                />
              )}
            </For>
          </li>
        </ul>
      )}
    </div>
  </div>
);

export default SearchCard;
