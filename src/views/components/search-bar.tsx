export default function SearchBar({ source }: { source?: string }) {
  return (
    <>
      <form
        id="search-form"
        hx-post="/search"
        hx-target="#search-results"
        hx-swap="innerHTML"
        hx-indicator="#loading-indicator"
        hx-request='\"timeout\":6000'
        class="flex w-full max-w-3xl items-center justify-center"
      >
        <label for="song-link" class="sr-only">
          Search
        </label>
        <input
          type="text"
          id="song-link"
          name="link"
          class="flex-1 rounded-lg border bg-white p-2.5 text-sm font-normal text-black placeholder:text-gray-400 lg:text-base"
          placeholder="https://open.spotify.com/track/7A8MwSsu9efJXP6xvZfRN3?si=d4f1e2eb324c43df"
          value={source}
        />
        <button
          type="submit"
          class="ml-2 rounded-lg border border-green-500 bg-green-500 p-2.5 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-white"
        >
          <i class="fas fa-search p-1 text-black" />
          <span class="sr-only">Search</span>
        </button>
      </form>
    </>
  );
}
