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
    main?.classList.add('has-results');
    // The sample shortcut and subtitle belong to the empty state only.
    if (this.hasSampleTarget) this.sampleTarget.classList.add('hidden');
    if (this.hasSubtitleTarget) this.subtitleTarget.classList.add('hidden');
  }

  connect() {
    // htmx 4 swaps HTTP error bodies into the
    // target, but transport failures (timeout, offline) never reach a swap.
    // Those land here.
    this.element.addEventListener('htmx:error', this.showTransportError);
    this.element.addEventListener('htmx:response:error', this.showRequestError);
    this.element.addEventListener('htmx:after:swap', this.compactAfterSwap);
  }

  disconnect() {
    this.element.removeEventListener('htmx:error', this.showTransportError);
    this.element.removeEventListener('htmx:response:error', this.showRequestError);
    this.element.removeEventListener('htmx:after:swap', this.compactAfterSwap);
  }

  // A settled swap just landed: move to the results state, but only for a
  // real result card. Bound so it can hang off addEventListener.
  compactAfterSwap = () => {
    const results = document.getElementById('search-results');
    if (!results?.querySelector('[data-controller="search-card"]')) return;
    this.compact();
  };

  // HTTP error statuses never reach the page (hx-status: swap:none): toast
  // the fragment text instead. Prior results stay put: a failed search must
  // not nuke good state.
  showRequestError = event => {
    if (this.hasFormTarget && event?.target !== this.formTarget) return;
    let message = 'Something went wrong, please try again later.';
    const ctx = event?.detail?.ctx;
    // The edge challenges /search itself, and a challenge page cannot be
    // solved inside an htmx request: solve it on /verify, which comes back.
    if (ctx?.response?.headers?.get?.('cf-mitigated') === 'challenge') {
      location.assign(`/verify?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    const text = ctx?.text ?? '';
    if (text) {
      try {
        const parsed = new DOMParser()
          .parseFromString(text, 'text/html')
          .body.textContent?.trim()
          .slice(0, 200);
        if (parsed) message = parsed;
      } catch {
        // Keep the generic message.
      }
    }
    toast().error(message);
  };

  showTransportError = event => {
    if (this.hasFormTarget && event?.target !== this.formTarget) return;
    toast().error('The search timed out or the connection dropped. Please try again.');
  };

  trySample(event) {
    event.preventDefault();
    if (this.hasLinkTarget) this.linkTarget.value = this.sampleLinkValue;
    if (this.hasFormTarget) this.formTarget.requestSubmit();
  }
}
