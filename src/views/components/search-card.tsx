import { SearchResult } from '~/services/search';

import SearchLink from './search-link';

export default function SearchCard(props: { searchResult: SearchResult }) {
  return (
    <div
      id="search-card"
      data-id={props.searchResult.id}
      class="m-4 flex max-w-2xl flex-wrap items-start justify-center rounded-lg border border-white md:p-4"
    >
      <div class="m-4 w-full md:w-44">
        <img
          class="mx-auto w-28 md:w-44"
          src={props.searchResult.image}
          alt={props.searchResult.title}
        />
      </div>
      <div class="mb-2 flex-1 flex-col items-start p-2 md:mr-6">
        <div class="mb-2 hyphens-auto text-center text-2xl font-normal md:text-start">
          {props.searchResult.title}
        </div>
        <p class="text-center text-sm md:text-start">{props.searchResult.description}</p>
        {props.searchResult.links.length === 0 && (
          <p class="mt-6 w-full text-center text-sm md:text-start">
            Not available on other platforms
          </p>
        )}
        {props.searchResult.links.length > 0 && (
          <ul class="mt-4 min-w-48 text-base">
            <li class="flex flex-col items-start">
              {props.searchResult.links.map(({ type, url, isVerified }) => (
                <SearchLink type={type} url={url} isVerified={isVerified} />
              ))}
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
