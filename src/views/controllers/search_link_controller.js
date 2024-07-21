import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
  static values = { url: String };

  async share() {
    await window.copyToClipboard(this.urlValue);
  }
}
