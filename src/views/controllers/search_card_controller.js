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

  /**
   * Shares the universal link using the Web Share API or copies it to the clipboard.
   */
  async share() {
    const universalLink = this.universalLinkValue;

    if (!universalLink) {
      console.error('Universal link not found');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'idonthavespotify',
          url: universalLink,
        });
        return;
      }

      await copyToClipboard(universalLink);
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Toggles the audio playback state and updates the play/pause icon.
   */
  toggleAudio() {
    const isPlaying = this.soundPlayer.playing();
    if (isPlaying) {
      this.soundPlayer.pause();
    } else {
      this.soundPlayer.play();
    }
    this.updateAudioPreviewIcon(isPlaying);
  }

  /**
   * Starts updating the audio progress bar.
   */
  startAudioProgress() {
    this.audioProgressTarget.parentNode.classList.remove('hidden');
    this.audioProgressInterval = setInterval(() => {
      const duration = this.soundPlayer.duration();
      const seek = this.soundPlayer.seek();
      const progress = (seek / duration) * 100;
      this.audioProgressTarget.style.width = `${progress}%`;
    }, 10);
  }

  /**
   * Stops updating the audio progress bar.
   */
  stopProgressUpdate() {
    clearInterval(this.audioProgressInterval);
  }

  /**
   * Resets the audio progress bar.
   */
  resetProgressBar() {
    clearInterval(this.audioProgressInterval);
    this.audioProgressTarget.style.width = '0%';
    this.audioProgressTarget.parentNode.classList.add('hidden');
  }

  /**
   * Updates the audio preview icon based on the playback state.
   * @param {boolean} isPlaying - Indicates if the audio is currently playing.
   */
  updateAudioPreviewIcon(isPlaying) {
    if (isPlaying) {
      this.iconTarget.classList.remove('ti-player-pause-filled');
      this.iconTarget.classList.add('ti-player-play-filled');
    } else {
      this.iconTarget.classList.remove('ti-player-play-filled');
      this.iconTarget.classList.add('ti-player-pause-filled');
    }
  }
}
