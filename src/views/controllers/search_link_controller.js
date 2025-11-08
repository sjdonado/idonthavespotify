import { Controller } from '@hotwired/stimulus';

import { copyToClipboard } from './helpers';

export default class extends Controller {
  /** @type {{ url: StringConstructor }} */
  static values = { url: String };

  /**
   * Copy the url value to the clipboard.
   * @returns {void}
   */
  share() {
    copyToClipboard(this.urlValue);
  }
}
