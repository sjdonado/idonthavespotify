export default function AudioPreview(props: {
  title: string;
  image: string;
  audio?: string;
}) {
  return props.audio ? (
    <>
      <div
        id="audio-preview"
        class="relative inline-block w-48 m-4"
        dir="ltr"
        data-audio-url={props.audio}
      >
        <img class="rounded-lg w-48" src={props.image} alt={props.title} />
        <div
          id="play-icon"
          class="rounded-lg absolute inset-0 flex justify-center items-center transition duration-200 ease-in-out bg-black bg-opacity-50"
        >
          <svg
            class="w-16 h-16 text-white transition duration-200 ease-in-out"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" />
          </svg>
        </div>
      </div>
      <script src="/assets/js/audio-preview.min.js" defer></script>
    </>
  ) : (
    <img class="w-48 m-4" src={props.image} alt={props.title} />
  );
}
