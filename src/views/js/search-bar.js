import { SPOTIFY_LINK_REGEX } from '~/config/constants';

const searchParams = new URLSearchParams(window.location.search);
const searchForm = document.getElementById('search-form');

searchForm.addEventListener('htmx:afterOnLoad', () => {
  const newSearchId = document.getElementById('search-card').getAttribute('data-id');
  updateQueryParams({ newSearchId });
});

const updateQueryParams = ({ newSearchId }) => {
  searchParams.set('id', newSearchId);
  window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
};

const submitSearch = ({ spotifyLink }) => {
  if (!SPOTIFY_LINK_REGEX.test(spotifyLink)) {
    return;
  }

  searchForm.querySelector('input').value = spotifyLink;
  htmx.ajax('POST', '/search', { source: '#search-form' });
};

const getSpotifyLinkFromClipboard = async () => {
  if ('clipboard' in navigator) {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (clipboardText) {
        submitSearch({ spotifyLink: clipboardText });
      }
    } catch (error) {
      console.error('Clipboard access error:', error);
    }
  } else {
    console.error('Clipboard API is not supported.');
  }
};

const searchId = searchParams.get('id');
if (searchId) {
  submitSearch({ spotifyLink: `https://open.spotify.com/track/${searchId}` });
}

getSpotifyLinkFromClipboard();
