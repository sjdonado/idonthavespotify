import { Controller } from '@hotwired/stimulus';
import { Howl } from 'howler';

import { copyToClipboard } from './helpers';

export default class extends Controller {
  static values = { id: String, universalLink: String, audio: String };
  static targets = ['icon'];

  async connect() {
    this.soundPlayer = new Howl({
      src: [this.audioValue],
      html5: true,
      volume: 0.7,
      onend: function () {
        this.updateAudioPreviewIcon();
      },
    });
  }

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

  toggleAudio() {
    if (this.soundPlayer.playing()) {
      this.soundPlayer.pause();
    } else {
      this.soundPlayer.play();
    }

    this.updateAudioPreviewIcon();
  }

  updateAudioPreviewIcon() {
    const iconElement = this.iconTarget;

    if (this.soundPlayer.playing()) {
      iconElement.classList.remove('fa-play');
      iconElement.classList.add('fa-pause');
    } else {
      iconElement.classList.remove('fa-pause');
      iconElement.classList.add('fa-play');
    }
  }
}
