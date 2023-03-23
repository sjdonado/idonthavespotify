import { createSignal } from 'solid-js';

import SearchBar, { SearchForm } from '~/components/SearchBar';
import SongCard, { Song } from '~/components/SongCard';

import getSpotifyMetaData from '~/services/spotify';
import getYoutubeLink from '~/services/youtube';

export default function Home() {
  const [song, setSong] = createSignal<Song | undefined>();

  const handleOnSearch = async (formData: SearchForm) => {
    const { title, description, image } = await getSpotifyMetaData(formData.songLink);

    const query = encodeURIComponent(`${title ?? ''} ${description ?? ''}`);

    const youtubeLink = await getYoutubeLink(query);

    setSong({
      title,
      description,
      image,
      youtubeLink,
    } as Song);
  };

  return (
    <main class="text-center mx-auto text-gray-700 p-4">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
        I don't have spotify
      </h1>
      <SearchBar onSearch={handleOnSearch} />
      {song() && <SongCard song={song()!} />}
    </main>
  );
}
