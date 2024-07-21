import { Controller } from '@hotwired/stimulus';

import { copyToClipboard } from './shared';

export default class extends Controller {
  static values = { id: String, universalLink: String };

  async share() {
    const universalLink = this.universalLinkValue;

    if (!universalLink) {
      console.error('Universal link not found');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Share this universal link',
          url: universalLink,
        });
        return;
      }

      await copyToClipboard(universalLink);
    } catch (err) {
      console.error(err);
    }
  }
}
