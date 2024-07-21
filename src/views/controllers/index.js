import { Application } from '@hotwired/stimulus';
import { registerControllers } from 'stimulus-vite-helpers';

const application = Application.start();
const controllers = import.meta.glob('./**/*_controller.js', { eager: true });
registerControllers(application, controllers);

// helpers
document.addEventListener('DOMContentLoaded', () => {
  window.toast = new Notyf({
    riple: false,
    dismissible: true,
    duration: 2000,
    types: [
      {
        type: 'success',
        background: 'black',
      },
    ],
  });

  window.copyToClipboard = async link => {
    // Older browser fallback
    if (!navigator.clipboard) {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } else {
      await navigator.clipboard.writeText(link);
    }

    window.toast.success('Link copied to clipboard!');
  };
});
