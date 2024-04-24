import LoadingIndicator from '../components/loading-indicator';
import SearchBar from '../components/search-bar';
import Footer from '../components/footer';

export default function Home() {
  return (
    <div class="flex flex-col overflow-y-auto md:h-screen">
      <LoadingIndicator />
      <main class="flex flex-1 flex-col items-center justify-start p-2">
        <div class="my-7 text-center sm:my-16">
          <h1 class="text-4xl uppercase md:text-5xl lg:text-6xl">I don't have Spotify</h1>
          <h2 class="mt-6 text-xs md:text-sm lg:text-lg">
            Paste a Spotify link and listen on other platforms.
          </h2>
        </div>
        <SearchBar />
      </main>
      <Footer />
    </div>
  );
}
