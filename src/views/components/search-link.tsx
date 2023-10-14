import { SpotifyContentLinkType } from '~/services/search';

const SEARCH_LINK_DICT = {
  [SpotifyContentLinkType.Youtube]: {
    icon: 'fab fa-youtube',
    label: 'Listen on Youtube',
  },
  [SpotifyContentLinkType.Deezer]: {
    icon: 'fab fa-deezer',
    label: 'Listen on Deezer',
  },
  [SpotifyContentLinkType.AppleMusic]: {
    icon: 'fab fa-apple',
    label: 'Listen on Apple Music',
  },
  [SpotifyContentLinkType.Tidal]: {
    icon: 'fa fa-music',
    label: 'Listen on Tidal',
  },
  [SpotifyContentLinkType.SoundCloud]: {
    icon: 'fab fa-soundcloud',
    label: 'Listen on SoundCloud',
  },
};

export default function SearchLink(props: {
  type: SpotifyContentLinkType;
  url: string;
  isVerified?: boolean;
}) {
  const spotifyContent = SEARCH_LINK_DICT[props.type];

  return (
    <a
      href={props.url}
      target="_blank"
      rel="noreferrer"
      aria-label={spotifyContent.label}
      class="flex items-center hover:text-gray-300 text-sm sm:text-base"
    >
      <i class={`${spotifyContent.icon} w-6 mr-1`} />
      {spotifyContent.label}
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
