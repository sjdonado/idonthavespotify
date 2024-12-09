import { Controller } from '@hotwired/stimulus';

import { SPOTIFY_LINK_REGEX, YOUTUBE_LINK_REGEX } from '~/config/constants';

import { toast } from './helpers';

export default class extends Controller {
  static targets = ['form', 'link'];

  initialize() {
    document.addEventListener('htmx:afterOnLoad', () => {
      const searchParams = new URLSearchParams(window.location.search);
      const searchId = this.element
        .querySelector(`[data-controller="search-card"]`)
        ?.getAttribute('data-search-card-id-value');

      if (searchId) {
        searchParams.set('id', searchId);
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}?${searchParams}`
        );
      }
    });

    document.addEventListener('htmx:timeout', function () {
      toast().error('Something went wrong, please try again later.');
    });
  }

  /**
   * Submits the form using a link obtained from the clipboard if it matches
   * specific patterns and no search ID is present in the URL.
   *
   * @returns {Promise<void>}
   */
  async submitFromClipboard() {
    if ('clipboard' in navigator) {
      const searchParams = new URLSearchParams(window.location.search);

      try {
        const clipboardText = await navigator.clipboard.readText();
        if (
          clipboardText.match(
            new RegExp(`${SPOTIFY_LINK_REGEX.source}|${YOUTUBE_LINK_REGEX.source}`)
          ) &&
          !searchParams.get('id')
        ) {
          this.linkTarget.value = link;
          this.formTarget.submit();
        }
      } catch (error) {
        toast().error('Clipboard access error');
      }
    } else {
      toast().error('Feature not supported in your browser');
    }
  }
}
