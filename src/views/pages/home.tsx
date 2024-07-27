import LoadingIndicator from '../components/loading-indicator';
import Footer from '../components/footer';

export default function Home({
  source,
  children,
}: {
  source?: string;
  children?: JSX.Element;
}) {
  return (
    <div class="flex h-svh flex-col gap-2 p-2">
      <LoadingIndicator />
      <main class="flex flex-1 flex-col items-center justify-start">
        <div class="my-8 flex flex-col gap-4 text-center sm:my-12">
          <h1 class="text-4xl uppercase md:text-5xl lg:text-6xl">I Don't Have Spotify</h1>
          <h2 class="text-sm lg:text-lg">
            Paste a Spotify link and listen on other platforms.
          </h2>
        </div>
        <div
          data-controller="search"
          class="my-4 flex w-full flex-col items-center gap-4"
        >
          <form
            data-search-target="form"
            hx-post="/search"
            hx-target="#search-results"
            hx-swap="innerHTML"
            hx-indicator="#loading-indicator"
            hx-request='\"timeout\":8000'
            class="flex w-full max-w-3xl items-center justify-center px-2"
          >
            <label for="song-link" class="sr-only">
              Search
            </label>
            <input
              id="song-link"
              data-search-target="link"
              type="text"
              name="link"
              class="flex-1 rounded-lg border bg-white p-2.5 font-normal text-black placeholder:text-gray-400"
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
          {/* <button */}
          {/*   data-action="search#submitFromClipboard" */}
          {/*   type="button" */}
          {/*   class="flex items-center justify-center gap-2 rounded-lg bg-zinc-700 px-3 py-1 text-sm font-semibold sm:hidden" */}
          {/* > */}
          {/*   <i class="fas fa-search" /> */}
          {/*   Search from Clipboard */}
          {/* </button> */}
          <div id="search-results">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
