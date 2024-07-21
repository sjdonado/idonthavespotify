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

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Share this universal link',
        url: universalLink,
      });
      return;
    }

    await copyLinkToClipboard(universalLink);
  } catch (err) {
    console.error(err);
  }
};

window.copyLinkToClipboard = async link => {
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

  // Older browser fallback
  if (!navigator.clipboard) {
    const textArea = document.createElement('textarea');
    textArea.value = link;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  } else {
    await navigator.clipboard.writeText(link);
  }

  notyf.success('Link copied to clipboard!');
};
