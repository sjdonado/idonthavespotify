import type { Component } from 'solid-js';

export interface Song {
  title: string;
  description: string;
  image: string;
  youtubeLink: string;
}

interface SongCardProps {
  song: Song;
}

const SongCard: Component<SongCardProps> = (props) => (
  <div class="max-w-sm rounded overflow-hidden shadow-lg">
    <img class="w-full" src={props.song.image} alt={props.song.title} />
    <div class="px-6 py-4">
      <div class="font-bold text-xl mb-2">{props.song.title}</div>
      <p class="text-gray-700 text-base">
        {props.song.description}
      </p>
      <ul class="list-disc pl-4">
        <li><a href={props.song.youtubeLink} >{props.song.youtubeLink}</a></li>
      </ul>
    </div>
  </div>
);

export default SongCard;
