import { Notyf } from 'notyf';

/** @type {Notyf | undefined} */
let _toast;

/**
 * Initializes and returns a Notyf instance for displaying toast notifications.
 *
 * @returns {Notyf} The Notyf instance for toast notifications.
 */
export const toast = () => {
  if (_toast) return _toast;

  _toast = new Notyf({
    ripple: false,
    dismissible: true,
    duration: 2000,
    types: [
      {
        type: 'success',
        background: 'black',
      },
    ],
  });

  return _toast;
};

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
