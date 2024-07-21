import { Controller } from '@hotwired/stimulus';
import { Howl } from 'howler';

import { copyToClipboard } from './helpers';

export default class extends Controller {
  static values = { id: String, universalLink: String, audio: String };
  static targets = ['icon', 'audioProgress'];

  async connect() {
    this.soundPlayer = new Howl({
      src: [this.audioValue],
      html5: true,
      volume: 0.7,
    });

    this.soundPlayer.on('end', () => {
      this.resetProgressBar();
      this.updateAudioPreviewIcon(true);
    });

    this.soundPlayer.on('play', () => {
      this.startAudioProgress();
    });

    this.soundPlayer.on('pause', () => {
      this.stopProgressUpdate();
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
    const isPlaying = this.soundPlayer.playing();
    if (isPlaying) {
      this.soundPlayer.pause();
    } else {
      this.soundPlayer.play();
    }
    this.updateAudioPreviewIcon(isPlaying);
  }

  startAudioProgress() {
    this.audioProgressInterval = setInterval(() => {
      const duration = this.soundPlayer.duration();
      const seek = this.soundPlayer.seek();
      const progress = (seek / duration) * 100;
      this.audioProgressTarget.style.width = `${progress}%`;
    }, 10);
  }

  stopProgressUpdate() {
    clearInterval(this.audioProgressInterval);
  }

  resetProgressBar() {
    clearInterval(this.audioProgressInterval);
    this.audioProgressTarget.style.width = '0%';
  }

  updateAudioPreviewIcon(playing) {
    const iconElement = this.iconTarget;
    if (playing) {
      iconElement.classList.remove('fa-pause');
      iconElement.classList.add('fa-play');
    } else {
      iconElement.classList.remove('fa-play');
      iconElement.classList.add('fa-pause');
    }
  }
}
