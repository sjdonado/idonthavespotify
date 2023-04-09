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
    isRecommended: true,
  [SpotifyContentLinkType.Deezer]: {
    icon: 'fab fa-deezer',
    label: 'Listen on Deezer',
    isVerified: true,
  },
  [SpotifyContentLinkType.AppleMusic]: {
    icon: 'fab fa-apple',
    label: 'Listen on Apple Music',
    isRecommended: false,
  },
  [SpotifyContentLinkType.Tidal]: {
    icon: 'fa fa-music',
    label: 'Listen on Tidal',
    isRecommended: false,
  },
  [SpotifyContentLinkType.SoundCloud]: {
    icon: 'fab fa-soundcloud',
    label: 'Listen on SoundCloud',
    isRecommended: false,
  },
};

const SpotifyContentLink = (props: {
  type: SpotifyContentLinkType,
  url: string,
}) => {
  const { label, icon, isRecommended } = SPOTIFY_CONTENT_LINK_DICT[props.type];

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
      {isRecommended && (
        <span class="inline-flex items-center ml-1 px-1 rounded-full text-[0.56rem] bg-green-500 text-black">Recommended</span>
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
              {({ type, url }) => <SpotifyContentLink type={type} url={url} />}
            </For>
          </li>
        </ul>
      )}
    </div>
  </div>
);

export default SearchCard;
