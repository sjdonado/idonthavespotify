import LoadingIndicator from '../components/loading-indicator';
import SearchBar from '../components/search-bar';
import Footer from '../components/footer';

export default function Home({
  source,
  children,
}: {
  source?: string;
  children?: JSX.Element;
}) {
  return (
    <div class="flex flex-col gap-2 h-screen p-2">
      <LoadingIndicator />
      <main class="flex flex-1 flex-col items-center justify-start">
        <div class="flex flex-col gap-4 my-8 text-center sm:my-12">
          <h1 class="text-4xl uppercase md:text-5xl lg:text-6xl">I don't have Spotify</h1>
          <h2 class="text-sm lg:text-lg">
            Paste a Spotify link and listen on other platforms.
          </h2>
        </div>
        <div class="my-4 w-full flex flex-col items-center gap-4">
          <SearchBar source={source} />
          <div id="search-results">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
