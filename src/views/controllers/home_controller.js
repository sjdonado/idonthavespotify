import { Controller } from '@hotwired/stimulus';

// Owns the home hero/results layout and the sample-track shortcut. The
// server renders the starting class from result presence; the submit action
// compacts the hero before the request so the skeleton lands under the
// compact header. No htmx event knowledge needed.
export default class extends Controller {
  /** @type {string[]} */
  static targets = ['form', 'link', 'sample'];

  /** @type {string} */
  static values = { sampleLink: String };

  compact() {
    const main = document.getElementById('home-main');
    // Swap both classes: the CSS wins on its own, but leaving a stale
    // `justify-center` utility behind is a trap for the next reader.
    main?.classList.replace('home-hero', 'has-results');
    main?.classList.replace('justify-center', 'justify-start');
    // The sample shortcut belongs to the empty state only.
    if (this.hasSampleTarget) this.sampleTarget.classList.add('hidden');
  }

  connect() {
    // htmx 4 swaps HTTP error bodies into the target, but transport
    // failures (timeout, offline) never reach a swap. Those land here.
    this.element.addEventListener('htmx:error', this.showTransportError);
  }

  disconnect() {
    this.element.removeEventListener('htmx:error', this.showTransportError);
  }

  showTransportError = () => {
    const results = document.getElementById('search-results');
    if (!results) return;
    this.compact();
    results.innerHTML =
      '<p class="mt-8 text-center" role="alert">The search timed out or the connection dropped. Please try again.</p>';
  };

  trySample(event) {
    event.preventDefault();
    if (this.hasLinkTarget) this.linkTarget.value = this.sampleLinkValue;
    this.compact();
    if (this.hasFormTarget) this.formTarget.requestSubmit();
  }
}
