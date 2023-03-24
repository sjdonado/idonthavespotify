import { createStore } from 'solid-js/store';

import type { Component } from 'solid-js';

export interface SearchForm {
  songLink: string
}

interface SearchBarProps {
  onSearch: (formData: SearchForm) => void;
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
        class="flex-1 bg-gray-700 border border-gray-600 placeholder-gray-400 p-2.5"
        placeholder="https://open.spotify.com/track/7A8MwSsu9efJXP6xvZfRN3?si=d4f1e2eb324c43df"
        onInput={handleInput}
        required
      />
      <button
        type="submit"
        class="p-2.5 ml-2 text-sm font-medium bg-green-600 text-white border border-green-700 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-800"
      >
        <i class="fas fa-search p-1" />
        <span class="sr-only">Search</span>
      </button>
    </form>
  );
};

export default SearchBar;
