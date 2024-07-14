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
        ) &&
        !searchParams.get('id')
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
  await getSpotifyLinkFromClipboard();
});

window.shareLink = async universalLink => {
  if (!universalLink) {
    console.error('Universal link not found');
    return;
  }

  const notyf = new Notyf({
    riple: false,
    dismissible: true,
    duration: 2000,
    types: [
      {
        type: 'success',
        background: 'black',
      },
    ],
  });

  try {
    if (navigator.share) {
      await navigator.share({
        title:
          "Check out this song available on multiple platforms via I Don't Have Spotify",
        url: universalLink,
      });
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(universalLink);
    } else {
      // Older browser fallback
      const textArea = document.createElement('textarea');
      textArea.value = universalLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    notyf.success('Link copied to clipboard!');
  } catch (err) {
    console.error(err);
  }
};
