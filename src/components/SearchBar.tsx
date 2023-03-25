import { createStore } from 'solid-js/store';

import type { Component } from 'solid-js';

export interface SearchForm {
  songLink: string
}

interface SearchBarProps {
  onSearch: (formData: SearchForm) => void;
  isLoading: boolean;
}

const SearchBar: Component<SearchBarProps> = (props) => {
  const [fields, setFields] = createStore<SearchForm>({
    songLink: '',
  });

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    props.onSearch(fields);
  };

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const key = target.name as keyof SearchForm;

    setFields(key, target.value);
  };

  return (
    <form class="flex justify-center items-center w-full lg:w-1/2" onSubmit={handleSubmit}>
      <label for="song-link" class="sr-only">Search</label>
      <input
        type="text"
        id="song-link"
        name="songLink"
        class="flex-1 bg-white text-black border placeholder-gray-400 rounded-lg p-2.5"
        placeholder="https://open.spotify.com/track/7A8MwSsu9efJXP6xvZfRN3?si=d4f1e2eb324c43df"
        onInput={handleInput}
        pattern="https:\/\/open.spotify.com\/.*"
        required
      />
      <button
        type="submit"
        class="p-2.5 ml-2 text-sm font-medium bg-green-500 text-white border border-green-500 rounded-lg focus:ring-1 focus:outline-none focus:ring-white"
        disabled={props.isLoading}
      >
        <i class="fas fa-search p-1 text-black" />
        <span class="sr-only">Search</span>
      </button>
    </form>
  );
};

export default SearchBar;
