import { SpotifyContent } from '~/services/search';

import AudioPreview from './audio-preview';
import SearchLink from './search-link';

export default function SearchCard(props: { spotifyContent: SpotifyContent }) {
  return (
    <div
      id="search-card"
      data-id={props.spotifyContent.id}
      class="flex flex-wrap items-start justify-center rounded-lg border border-white max-w-2xl m-4 md:p-12"
    >
      <AudioPreview
        title={props.spotifyContent.title}
        image={props.spotifyContent.image}
        audio={props.spotifyContent.audio}
      />
      <div class="flex-1 flex-col items-start p-2 mb-2 md:mr-6">
        <div class="font-bold text-xl hyphens-auto mb-2">
          {props.spotifyContent.title}
        </div>
        <p class="text-sm h-10 max-h-10 overflow-clip">
          {props.spotifyContent.description}
        </p>
        {props.spotifyContent.links.length === 0 && (
          <p class="my-12 text-sm text-center w-full">Not available on other platforms</p>
        )}
        {props.spotifyContent.links.length > 0 && (
          <ul class="mt-2 text-base min-w-[12rem]">
            <li class="flex flex-col items-start">
              {props.spotifyContent.links.map(({ type, url, isVerified }) => (
                <SearchLink type={type} url={url} isVerified={isVerified} />
              ))}
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
