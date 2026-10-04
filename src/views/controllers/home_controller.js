import { Controller } from '@hotwired/stimulus';

import { toast } from './helpers';

// The link a challenged search was carrying, kept across the /verify round
// trip so the search resumes instead of starting from an empty input.
const RESUME_KEY = 'idhs:resume-link';
const RESUME_TTL_MS = 2 * 60 * 1000;

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
    this.resumeAfterVerify();
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
    this.resuming = false;
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
    // The resumed search settles here or in compactAfterSwap: either way,
    // later searches on this page may go through /verify again.
    const resumed = this.resuming;
    this.resuming = false;
    const ctx = event?.detail?.ctx;
    // The edge challenges /search itself, and a challenge page cannot be
    // solved inside an htmx request: solve it on /verify, which comes back.
    if (ctx?.response?.headers?.get?.('cf-mitigated') === 'challenge') {
      // Once per round trip: a search resumed after /verify that is
      // challenged again toasts instead of looping through /verify.
      if (resumed) {
        toast().error('The bot check did not pass. Please try again in a moment.');
        return;
      }
      try {
        if (this.hasLinkTarget) {
          sessionStorage.setItem(
            RESUME_KEY,
            JSON.stringify({
              link: this.linkTarget.value,
              next: location.pathname + location.search,
              at: Date.now(),
            })
          );
        }
      } catch {
        // Storage blocked: the visitor re-enters the link after /verify.
      }
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
    this.resuming = false;
    toast().error('The search timed out or the connection dropped. Please try again.');
  };

  resumeAfterVerify() {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(RESUME_KEY) ?? 'null');
      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      return;
    }
    // Only the page /verify returned to, and only soon after: an abandoned
    // check must not replay an old search on some later load of this tab.
    if (!saved?.link || saved.next !== location.pathname + location.search) return;
    if (Date.now() - saved.at > RESUME_TTL_MS) return;
    if (!this.hasLinkTarget || !this.hasFormTarget) return;
    this.resuming = true;
    this.linkTarget.value = saved.link;
    // htmx binds the form on DOMContentLoaded, which may not have fired yet
    // when Stimulus connects (module scripts run before it).
    const submit = () => setTimeout(() => this.formTarget.requestSubmit(), 0);
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav?.domContentLoadedEventEnd > 0) submit();
    else document.addEventListener('DOMContentLoaded', submit, { once: true });
  }

  trySample(event) {
    event.preventDefault();
    if (this.hasLinkTarget) this.linkTarget.value = this.sampleLinkValue;
    if (this.hasFormTarget) this.formTarget.requestSubmit();
  }
}
