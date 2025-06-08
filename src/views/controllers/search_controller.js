import { Controller } from '@hotwired/stimulus';

import { toast } from './helpers';

export default class extends Controller {
  static targets = ['form', 'link'];

  connect() {
    if (window.umami && !window.umamiTracked) {
      window.umami.track();
      window.umamiTracked = true;
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

    document.addEventListener('htmx:error', function () {
      toast().error('Something went wrong, please try again later.');
    });
  }
}
