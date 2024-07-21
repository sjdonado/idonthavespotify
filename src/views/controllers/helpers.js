import { Notyf } from 'notyf';

let _toast;

export const toast = () => {
  if (_toast) return _toast;

  _toast = new Notyf({
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

  return _toast;
};

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
