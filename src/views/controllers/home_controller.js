import { Controller } from '@hotwired/stimulus';

import { toast } from './helpers';

// Owns the home hero/results layout and the sample-track shortcut. The
// server renders the starting class from result presence; the layout stays
// put while a search is in flight (only loading indicators show) and
// compacts once the swap lands, since the swapped fragment covers only
// #search-results while the layout classes, subtitle, and sample button
// live outside it. No other htmx event knowledge needed.
export default class extends Controller {
  /** @type {string[]} */
  static targets = ['form', 'link', 'sample', 'subtitle'];

  /** @type {string} */
  static values = { sampleLink: String };

  compact() {
    const main = document.getElementById('home-main');
    // Unlayered CSS owns justification per state; just drop the hero
    // utility so no stale class lingers for the next reader.
    main?.classList.replace('home-hero', 'has-results');
    main?.classList.remove('justify-center');
    // The sample shortcut and subtitle belong to the empty state only.
    if (this.hasSampleTarget) this.sampleTarget.classList.add('hidden');
    if (this.hasSubtitleTarget) this.subtitleTarget.classList.add('hidden');
  }

  connect() {
    // While the gate modal owns the screen, remove the background from the
    // keyboard and accessibility trees. The footer stays interactive by
    // explicit decision (single always-visible footer); everything else
    // behind the modal goes inert. htmx 4 swaps HTTP error bodies into the
    // target, but transport failures (timeout, offline) never reach a swap.
    // Those land here.
    if (document.getElementById('gate-modal')) this.element.inert = true;
    this.element.addEventListener('htmx:error', this.showTransportError);
    this.element.addEventListener('htmx:response:error', this.showRequestError);
    this.element.addEventListener('htmx:afterSwap', this.compactAfterSwap);
    this.element.addEventListener('htmx:after:swap', this.compactAfterSwap);
  }

  disconnect() {
    this.element.removeEventListener('htmx:error', this.showTransportError);
    this.element.removeEventListener('htmx:response:error', this.showRequestError);
    this.element.removeEventListener('htmx:afterSwap', this.compactAfterSwap);
    this.element.removeEventListener('htmx:after:swap', this.compactAfterSwap);
  }

  // Results (or an HTTP error fragment) just landed: now move to the
  // results state. Bound so it can hang off addEventListener. Only a real
  // result card compacts: error bodies never swap (hx-status) and must
  // leave the hero untouched.
  compactAfterSwap = () => {
    const results = document.getElementById('search-results');
    if (!results?.querySelector('[data-controller="search-card"]')) return;
    this.compact();
  };

  // HTTP error statuses never reach the page (hx-status: swap:none): toast
  // the fragment text instead. Scoped to the search form; gate forms keep
  // their inline field errors.
  showRequestError = event => {
    if (this.hasFormTarget && event.target !== this.formTarget) return;
    let message = 'Something went wrong, please try again later.';
    const text = event?.detail?.ctx?.text ?? '';
    if (text) {
      try {
        const parsed = new DOMParser()
          .parseFromString(text, 'text/html')
          .body.textContent?.trim();
        if (parsed) message = parsed;
      } catch {
        // Keep the generic message.
      }
    }
    toast().error(message);
  };

  showTransportError = () => {
    toast().error('The search timed out or the connection dropped. Please try again.');
  };

  trySample(event) {
    event.preventDefault();
    if (this.hasLinkTarget) this.linkTarget.value = this.sampleLinkValue;
    if (this.hasFormTarget) this.formTarget.requestSubmit();
  }
}
