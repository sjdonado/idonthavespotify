import { Component } from 'solid-js';

import type { SpotifyContent } from '~/@types/global';

import AudioPreview from './AudioPreview';

interface SearchCardProps {
  spotifyContent: SpotifyContent;
}

const SpotifyContentLink = (props: {
  link: string,
  icon: string,
  label: string,
  isRecommended?: boolean
}) => (
  <a
    href={props.link}
    target="_blank"
    rel="noreferrer"
    aria-label={props.label}
    class="flex items-center hover:text-gray-300 text-sm sm:text-base"
  >
    <i class={`${props.icon} w-6 mr-1`} />
    {props.label}
    {props.isRecommended && (
      <span class="inline-flex items-center ml-1 px-1 rounded-full text-[0.56rem] bg-green-500 text-black">Recommended</span>
    )}
  </a>
);

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
    <div class="flex flex-col items-start p-2">
      <div class="font-bold text-xl">{props.spotifyContent.title}</div>
      <p class="text-sm w-52 sm:w-96 truncate">{props.spotifyContent.description}</p>
      <ul class="mt-2 text-base">
        <li class="flex flex-col items-start">
          <SpotifyContentLink
            link={props.spotifyContent.links.youtube}
            icon="fab fa-youtube"
            label="Listen on Youtube"
            isRecommended
          />
          <SpotifyContentLink
            link={props.spotifyContent.links.appleMusic}
            icon="fab fa-apple"
            label="Listen on Apple Music"
          />
          <SpotifyContentLink
            link={props.spotifyContent.links.tidal}
            icon="fa fa-music"
            label="Listen on Tidal"
          />
          <SpotifyContentLink
            link={props.spotifyContent.links.soundCloud}
            icon="fab fa-soundcloud"
            label="Listen on SoundCloud"
          />
        </li>
      </ul>
    </div>
  </div>
);

export default SearchCard;
