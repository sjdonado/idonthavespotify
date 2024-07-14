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
      class="flex items-center text-sm hover:text-gray-300 sm:text-base"
    >
      <i class={`${searchResult.icon} mr-1 w-6`} />
      <p class="underline decoration-0 underline-offset-2">{searchResult.label}</p>
      {props.isVerified && (
        <span
          class="ml-1 inline-flex items-center justify-center rounded-full bg-green-500 p-1 text-[0.56rem]"
          aria-label="Verified"
        >
          <i class="fas fa-check" />
        </span>
      )}
    </a>
  );
}
