import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

/**
 * Dependency-free toast notifications, themed to the app: dark zinc pill,
 * single accent edge, bottom-center. Same call surface as before, so no
 * controller changes beyond this file.
 * @param {string} message
 * @param {boolean} ok
 */
const show = (message, ok) => {
  Toastify({
    text: message,
    duration: ok ? 2500 : 4000,
    close: false,
    gravity: 'bottom',
    position: 'center',
    stopOnFocus: true,
    escapeMarkup: true,
    className: ok ? 'idhs-toast idhs-toast--success' : 'idhs-toast idhs-toast--error',
  }).showToast();
};

export const toast = () => ({
  success: message => show(message, true),
  error: message => show(message, false),
});

/**
 * Copies the provided link to the clipboard and shows a success toast notification.
 * If the clipboard API is not available, it falls back to using a temporary textarea.
 *
 * @param {string} link - The link to copy to the clipboard.
 * @returns {Promise<void>}
 */
export const copyToClipboard = async link => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(link);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    toast().success('Link copied to clipboard!');
  } catch (err) {
    toast().error(err.message);
  }
};
