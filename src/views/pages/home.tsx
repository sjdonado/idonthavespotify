import LoadingIndicator from '../components/loading-indicator';
import SearchBar from '../components/search-bar';
import Footer from '../components/footer';

export default function Home(props: { searchCount?: number }) {
  return (
    <div class="bg-black text-white flex flex-col h-screen overflow-y-auto">
      <LoadingIndicator />
      <main class="flex-1 flex flex-col justify-start items-center p-2">
        <div class="text-center my-7 sm:my-16">
          <h1 class="text-5xl md:text-6xl uppercase">I don't have Spotify</h1>
          <h2 class="mt-6 text-sm md:text-lg">
            Paste a Spotify link and get the content on other platforms.
          </h2>
        </div>
        <SearchBar />
      </main>
      <Footer searchCount={props.searchCount} />
    </div>
  );
}
