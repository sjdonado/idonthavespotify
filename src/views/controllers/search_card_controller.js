import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
  static values = { universalLink: String };

  async shareLink() {
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

      await window.copyLinkToClipboard(universalLink);
    } catch (err) {
      console.error(err);
    }
  }
}
