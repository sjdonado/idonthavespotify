import type { Component } from 'solid-js';

export interface Song {
  title: string;
  description: string;
  image: string;
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

const SongLink = (props: { link: string, icon: string, label: string }) => (
  <a
    href={props.link}
    target="_blank"
    rel="noreferrer"
    aria-label={props.label}
    class="flex items-center hover:text-gray-300"
  >
    <i class={`${props.icon} w-6 mr-1`} />
    {props.label}
  </a>
);

const SongCard: Component<SongCardProps> = (props) => (
  <div class="flex flex-wrap justify-start items-center border border-white w-5/6 lg:w-1/2 m-5">
    <img class="w-full md:w-48 p-1" src={props.song.image} alt={props.song.title} />
    <div class="flex flex-col items-start p-2">
      <div class="font-bold text-xl">{props.song.title}</div>
      <p class="text-sm"> {props.song.description} </p>
      <ul class="mt-2 text-base">
        <li class="flex flex-col items-start">
          <SongLink
            link={props.song.links.youtube}
            icon="fab fa-youtube"
            label="Listen on Youtube"
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
