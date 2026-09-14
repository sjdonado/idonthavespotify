import { Controller } from '@hotwired/stimulus';

import { toast } from './helpers';

export default class extends Controller {
  /** @type {string[]} */
  static targets = ['form', 'link'];

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
      const status = event.detail.errorInfo.xhr.status;
      if (status === 400 || status === 401 || status === 429) {
        try {
          const response = JSON.parse(event.detail.errorInfo.xhr.responseText);
          toast().error(response.message || response.error);
          return;
        } catch {
          // Fall through to the generic message.
        }
      }

      toast().error('Something went wrong, please try again later.');
    });
  }
}
