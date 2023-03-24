import type { Component } from 'solid-js';

export interface Song {
  title: string;
  description: string;
  image: string;
  links: {
    youtube: string;
    appleMusic: string;
  }
}

interface SongCardProps {
  song: Song;
}

const SongCard: Component<SongCardProps> = (props) => (
  <div class="flex flex-wrap justify-start items-center border border-white w-5/6 lg:w-1/2 m-5">
    <img class="w-full md:w-48 p-1" src={props.song.image} alt={props.song.title} />
    <div class="flex flex-col items-start p-2">
      <div class="font-bold text-xl">{props.song.title}</div>
      <p class="text-sm"> {props.song.description} </p>
      <ul class="mt-2 text-base">
        <li class="flex items-center">
          <a
            href={props.song.links.youtube}
            target="_blank"
            rel="noreferrer"
            aria-label="Listen on Youtube"
            class="flex items-center hover:text-gray-300"
          >
            <i class="fab fa-youtube mr-1 text-xl" />
            Listen on Youtube
          </a>
        </li>
        <li class="flex items-center">
          <a
            href={props.song.links.appleMusic}
            target="_blank"
            rel="noreferrer"
            aria-label="Listen on Youtube"
            class="flex items-center hover:text-gray-300"
          >
            <i class="fab fa-apple mr-1 text-xl" />
            Listen on Apple Music
          </a>
        </li>
      </ul>
    </div>
  </div>
);

export default SongCard;
