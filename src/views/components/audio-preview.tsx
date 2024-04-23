export default function AudioPreview(props: {
  title: string;
  image: string;
  audio?: string;
}) {
  return props.audio ? (
    <div
      id="audio-preview"
      class="relative m-4 inline-block w-48"
      dir="ltr"
      data-audio-url={props.audio}
    >
      <img class="w-48 rounded-lg" src={props.image} alt={props.title} />
      <div
        id="play-icon"
        class="absolute inset-0 flex items-center justify-center rounded-lg bg-black bg-opacity-50 transition duration-200 ease-in-out"
      >
        <svg
          class="size-16 text-white transition duration-200 ease-in-out"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" />
        </svg>
      </div>
    </div>
  ) : (
    <img class="m-4 w-48" src={props.image} alt={props.title} />
  );
}
