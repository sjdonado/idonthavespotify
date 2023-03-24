import { Component, Show, createSignal } from 'solid-js';

interface AudioPreviewProps {
  title: string;
  image: string;
  audio?: string;
}

const AudioPreview: Component<AudioPreviewProps> = (props) => {
  const [showPlayIcon, setShowPlayIcon] = createSignal(true);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [audioPreview, setAudioPreview] = createSignal<HTMLAudioElement>();

  const playSong = async () => {
    const audio = new Audio(props.audio);
    await audio.play();

    setAudioPreview(audio);
    setIsPlaying(true);
    setShowPlayIcon(false);
  };

  const pauseSong = () => {
    audioPreview()?.pause();
    setIsPlaying(false);
    setShowPlayIcon(true);
  };

  return (
    <Show
      when={props.audio}
      fallback={<img class="w-full md:w-48 p-1" src={props.image} alt={props.title} />}
    >
      <div
        class="relative inline-block"
        onMouseOver={() => setShowPlayIcon(!isPlaying())}
        onMouseOut={() => setShowPlayIcon(isPlaying())}
        onClick={() => (isPlaying() ? pauseSong() : playSong())}
      >
        <img class="w-full md:w-48 p-1" src={props.image} alt={props.title} />
        <div class={`absolute inset-0 flex justify-center items-center transition duration-200 ease-in-out bg-black bg-opacity-50 ${showPlayIcon() || isPlaying() ? 'opacity-100' : 'opacity-0'}`}>
          <svg class="w-16 h-16 text-white transition duration-200 ease-in-out" viewBox="0 0 24 24">
            <path fill="currentColor" d={isPlaying() ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'} />
          </svg>
        </div>
      </div>
    </Show >
  );
};

export default AudioPreview;
