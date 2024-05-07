import { ServiceType } from '~/config/enum';

const SEARCH_LINK_DICT = {
  [ServiceType.Spotify]: {
    icon: 'fab fa-spotify',
    label: 'Listen on Spotify',
  },
  [ServiceType.YouTube]: {
    icon: 'fab fa-youtube',
    label: 'Listen on YouTube Music',
  },
  [ServiceType.Deezer]: {
    icon: 'fab fa-deezer',
    label: 'Listen on Deezer',
  },
  [ServiceType.AppleMusic]: {
    icon: 'fab fa-apple',
    label: 'Listen on Apple Music',
  },
  [ServiceType.Tidal]: {
    icon: 'fa fa-music',
    label: 'Listen on Tidal',
  },
  [ServiceType.SoundCloud]: {
    icon: 'fab fa-soundcloud',
    label: 'Listen on SoundCloud',
  },
};

export default function SearchLink(props: {
  type: ServiceType;
  url: string;
  isVerified?: boolean;
}) {
  const searchResult = SEARCH_LINK_DICT[props.type];

  return (
    <a
      href={props.url}
      target="_blank"
      rel="noreferrer"
      aria-label={searchResult.label}
      class="flex items-center hover:text-gray-300 text-sm sm:text-base"
    >
      <i class={`${searchResult.icon} w-6 mr-1`} />
      <p class="underline decoration-0 underline-offset-2">{searchResult.label}</p>
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
}
