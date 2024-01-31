import { SpotifyContent } from '~/services/search';

import AudioPreview from './audio-preview';
import SearchLink from './search-link';

export default function SearchCard(props: { spotifyContent: SpotifyContent }) {
  return (
    <div
      id="search-card"
      data-id={props.spotifyContent.id}
      class="m-4 flex max-w-2xl flex-wrap items-start justify-center rounded-lg border border-white md:p-4"
    >
      <AudioPreview
        title={props.spotifyContent.title}
        image={props.spotifyContent.image}
        audio={props.spotifyContent.audio}
      />
      <div class="mb-2 flex-1 flex-col items-start p-2 md:mr-6">
        <div class="mb-2 hyphens-auto text-center text-2xl font-normal md:text-start">
          {props.spotifyContent.title}
        </div>
        <p class="h-5 max-h-10 text-clip text-center text-sm md:text-start">
          {props.spotifyContent.description}
        </p>
        {props.spotifyContent.links.length === 0 && (
          <p class="mt-6 w-full text-center text-sm md:text-start">
            Not available on other platforms
          </p>
        )}
        {props.spotifyContent.links.length > 0 && (
          <ul class="mt-4 min-w-[12rem] text-base">
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
