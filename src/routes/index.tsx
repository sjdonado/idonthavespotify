import { createSignal } from 'solid-js';

import SearchBar, { SearchForm } from '~/components/SearchBar';
import SongCard, { Song } from '~/components/SongCard';

import getSpotifyMetaData from '~/services/spotify';
import getYoutubeLink from '~/services/youtube';

export default function Home() {
  const [song, setSong] = createSignal<Song | undefined>({
    title: "Fidjos d'Africa",
    description: 'Cretcheu · Song · 2015',
    image: 'https://i.scdn.co/image/ab67616d0000b27319ed0a2486009ff82606cb19',
    youtubeLink: 'https://www.youtube.com/watch?v=F3MqfhzHJ60',
  });

  const handleOnSearch = async (formData: SearchForm) => {
    const { title, description, image } = await getSpotifyMetaData(formData.songLink);

    const query = encodeURIComponent(`${title ?? ''} ${description?.includes('Song') ? description : ''}`);

    const youtubeLink = await getYoutubeLink(query);

    setSong({
      title,
      description,
      image,
      youtubeLink,
    } as Song);
  };

  return (
    <main class="bg-gray-900 text-white font-thin flex flex-col justify-start items-center p-4 h-screen overflow-auto">
      <h1 class="text-center max-6-xs text-6xl uppercase my-16">
        I don't have spotify
      </h1>
      <SearchBar onSearch={handleOnSearch} />
      {song() && <SongCard song={song()!} />}
    </main>
  );
}
