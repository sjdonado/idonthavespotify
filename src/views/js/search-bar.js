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

const submitSearch = ({ link }) => {
  searchForm.querySelector('input').value = link;
  htmx.ajax('POST', '/search', { source: '#search-form' });
};

const getSpotifyLinkFromClipboard = async () => {
  if ('clipboard' in navigator) {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (clipboardText) {
        submitSearch({ link: clipboardText });
      }
    } catch (error) {
      console.error('Clipboard access error:', error);
    }
  } else {
    console.error('Clipboard API is not supported.');
  }
};

// TODO: if searchId send an extra param
// const searchId = searchParams.get('id');
// if (searchId) {
//   submitSearch({ link: `https://open.spotify.com/track/${searchId}` });
// }

document.addEventListener('htmx:timeout', function () {
  document.getElementById('search-results').innerHTML =
    '<p class="mt-8 text-center">Something went wrong, try again later.</p>';
});

getSpotifyLinkFromClipboard();
