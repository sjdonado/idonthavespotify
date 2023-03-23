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
    <form class="flex items-center" onSubmit={handleSubmit}>
      <label for="song-link" class="sr-only">Search</label>
      <div class="relative w-full">
        <input
          type="text"
          id="song-link"
          name="songLink"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-5 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="https://open.spotify.com/track/7A8MwSsu9efJXP6xvZfRN3?si=d4f1e2eb324c43df"
          onInput={handleInput}
          required
        />
      </div>
      <button
        type="submit"
        class="p-2.5 ml-2 text-sm font-medium text-white bg-blue-700 rounded-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg
        >
        <span class="sr-only">Search</span>
      </button>
    </form>
  );
};

export default SearchBar;
