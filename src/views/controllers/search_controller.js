import { Controller } from '@hotwired/stimulus';

import { toast } from './helpers';

/**
 * @global
 * @typedef {Object} WindowWithUmami
 * @property {Object} [umami] – optional umami tracker
 * @property {Function} [umami.track] – track method
 * @property {boolean} [umamiTracked] – flag to prevent duplicate tracking
 */

/** @type {WindowWithUmami} */
const win = window;

export default class extends Controller {
  /** @type {string[]} */
  static targets = ['form', 'link'];

  connect() {
    if (win.umami && !win.umamiTracked) {
      win.umami.track();
      win.umamiTracked = true;
    }
  }

  initialize() {
    document.addEventListener('htmx:afterSwap', () => {
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

    document.addEventListener('htmx:error', function (event) {
      if (event.detail.errorInfo.xhr.status === 400) {
        const response = JSON.parse(event.detail.errorInfo.xhr.responseText);
        toast().error(response.message);
        return;
      }

      toast().error('Something went wrong, please try again later.');
    });
  }
}
