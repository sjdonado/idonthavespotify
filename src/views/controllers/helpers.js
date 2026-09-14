/** @type {HTMLElement | undefined} */
let container;

/**
 * Dependency-free replacement for Notyf: toasts confirm outcomes only.
 * Field and action failures render inline and never toast; the one
 * exception is a failed copy itself, which has no inline surface to land
 * on, so the failure to confirm still toasts.
 */
const ensureContainer = () => {
  if (container) return container;

  container = document.createElement('div');
  container.setAttribute('aria-live', 'polite');
  container.className =
    'pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4';
  document.body.appendChild(container);

  return container;
};

/**
 * @param {string} message
 * @param {boolean} ok
 */
const show = (message, ok) => {
  const toast = document.createElement('p');
  toast.className = `pointer-events-auto w-full rounded-lg border px-4 py-3 text-center text-sm font-normal shadow-lg ${
    ok ? 'border-green-500 bg-zinc-900 text-white' : 'border-red-500 bg-zinc-900 text-white'
  }`;
  toast.textContent = message;
  ensureContainer().appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
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
