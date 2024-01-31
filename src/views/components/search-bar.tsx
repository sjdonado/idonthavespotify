import { SPOTIFY_LINK_REGEX } from '~/config/constants';

export default function SearchBar() {
  return (
    <>
      <form
        id="search-form"
        hx-post="/search"
        hx-target="#search-results"
        hx-swap="innerHTML"
        hx-indicator="#loading-indicator"
        hx-request='\"timeout\":12000'
        class="flex justify-center items-center w-full max-w-3xl"
      >
        <label for="song-link" class="sr-only">
          Search
        </label>
        <input
          type="text"
          id="song-link"
          name="spotifyLink"
          class="flex-1 bg-white text-black border placeholder-gray-400 rounded-lg p-2.5 font-normal"
          placeholder="https://open.spotify.com/track/7A8MwSsu9efJXP6xvZfRN3?si=d4f1e2eb324c43df"
          pattern={SPOTIFY_LINK_REGEX.source}
        />
        <button
          type="submit"
          class="p-2.5 ml-2 text-sm font-medium bg-green-500 text-white border border-green-500 rounded-lg focus:ring-1 focus:outline-none focus:ring-white"
        >
          <i class="fas fa-search p-1 text-black" />
          <span class="sr-only">Search</span>
        </button>
      </form>
      <div id="search-results"></div>
      <script src="/assets/js/search-bar.min.js" defer></script>
    </>
  );
}
