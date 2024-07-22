import { Controller } from '@hotwired/stimulus';

import { copyToClipboard } from './helpers';

export default class extends Controller {
  static values = { url: String };

  share() {
    copyToClipboard(this.urlValue);
  }
}
