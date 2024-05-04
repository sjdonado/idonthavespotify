import { SPOTIFY_LINK_REGEX, YOUTUBE_LINK_REGEX } from '~/config/constants';

const searchParams = new URLSearchParams(window.location.search);

const submitSearch = ({ link }) => {
  const searchForm = document.getElementById('search-form');
  searchForm.querySelector('input').value = link;

  htmx.ajax('POST', '/search', { source: '#search-form' });
};

const getSpotifyLinkFromClipboard = async () => {
  if ('clipboard' in navigator) {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (
        clipboardText.match(
          new RegExp(`${SPOTIFY_LINK_REGEX.source}|${YOUTUBE_LINK_REGEX.source}`)
        )
      ) {
        submitSearch({ link: clipboardText });
      }
    } catch (error) {
      console.error('Clipboard access error:', error);
    }
  } else {
    console.error('Clipboard API is not supported.');
  }
};

document.addEventListener('htmx:afterOnLoad', () => {
  const searchId = document.getElementById('search-card')?.getAttribute('data-id');
  if (searchId) {
    searchParams.set('id', searchId);
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`);
  }
});

document.addEventListener('htmx:timeout', function () {
  document.getElementById('search-results').innerHTML =
    '<p class="mt-8 text-center">Something went wrong, try again later.</p>';
});

document.addEventListener('DOMContentLoaded', async () => {
  const searchId = searchParams.get('id');
  if (searchId) {
    htmx.ajax('POST', '/search', {
      source: '#search-form',
      values: {
        searchId,
      },
    });
    return;
  }

  await getSpotifyLinkFromClipboard();
});
