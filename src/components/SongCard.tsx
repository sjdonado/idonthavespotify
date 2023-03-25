import { Component } from 'solid-js';

import { MetadataType } from '~/server/spotify';
import AudioPreview from './AudioPreview';

export interface Song {
  title: string;
  description: string;
  type: MetadataType;
  image: string;
  audio?: string;
  links: {
    youtube: string;
    appleMusic: string;
    tidal: string;
    soundcloud: string;
  }
}

interface SongCardProps {
  song: Song;
}

const SongLink = (props: {
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
    class="flex items-center hover:text-gray-300"
  >
    <i class={`${props.icon} w-6 mr-1`} />
    {props.label}
    {props.isRecommended && (
      <span class="inline-flex items-center ml-1 px-1 rounded-full text-[0.56rem] bg-green-500 text-black">Recommended</span>
    )}
  </a>
);

const SongCard: Component<SongCardProps> = (props) => (
  <div class="flex flex-wrap justify-start items-center rounded-lg border border-white w-5/6 lg:w-1/2 m-5">
    <AudioPreview
      title={props.song.title}
      image={props.song.image}
      audio={props.song.audio}
    />
    <div class="flex flex-col items-start p-2">
      <div class="font-bold text-xl">{props.song.title}</div>
      <p class="text-sm w-52 sm:w-96 truncate">{props.song.description}</p>
      <ul class="mt-2 text-base">
        <li class="flex flex-col items-start">
          <SongLink
            link={props.song.links.youtube}
            icon="fab fa-youtube"
            label="Listen on Youtube"
            isRecommended
          />
          <SongLink
            link={props.song.links.appleMusic}
            icon="fab fa-apple"
            label="Listen on Apple Music"
          />
          <SongLink
            link={props.song.links.tidal}
            icon="fa fa-music"
            label="Listen on Tidal"
          />
          <SongLink
            link={props.song.links.soundcloud}
            icon="fab fa-soundcloud"
            label="Listen on Soundcloud"
          />
        </li>
      </ul>
    </div>
  </div>
);

export default SongCard;
