import { createSignal } from 'solid-js';

import SearchBar, { SearchForm } from '~/components/SearchBar';
import SongCard, { Song } from '~/components/SongCard';

import spotifyService from '~/services/spotify';
import youtubeService from '~/services/youtube';
import appleMusicService from '~/services/appleMusic';
import tidalService from '~/services/tidal';
import soundcloudService from '~/services/soundcloud';

export default function Home() {
  const [song, setSong] = createSignal<Song | undefined>();
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();

  const handleOnSearch = async (formData: SearchForm) => {
    setLoading(true);

    try {
      const { title, description, image } = await spotifyService(formData.songLink);

      const youtubeLink = await youtubeService(title, description);
      const appleMusicLink = appleMusicService(title);
      const tidalLink = tidalService(title);
      const soundcloudLink = soundcloudService(title);

      const searchedSong = {
        title,
        description,
        image,
        links: {
          youtube: youtubeLink,
          appleMusic: appleMusicLink,
          tidal: tidalLink,
          soundcloud: soundcloudLink,
        },
      } as Song;

      setSong(searchedSong);
    } catch (err) {
      setError('Something went wrong, try again later');
    }
    setLoading(false);
  };

  return (
    <main class="bg-gray-900 text-white font-thin flex flex-col justify-start items-center p-4 h-screen overflow-auto">
      <h1 class="text-center max-6-xs text-6xl uppercase my-16">
        I don't have spotify
      </h1>
      <SearchBar onSearch={handleOnSearch} isLoading={loading()} />
      {loading() && <p class="mt-8">Loading...</p>}
      {song() && <SongCard song={song()!} />}
      {error() && <p class="mt-8">{error()}</p>}
    </main>
  );
}
