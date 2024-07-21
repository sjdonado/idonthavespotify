window.copyLinkToClipboard = async link => {
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
