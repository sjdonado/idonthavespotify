const audioPreview = document.getElementById('audio-preview');
const audioURL = audioPreview.getAttribute('data-audio-url');

const audio = new Audio(audioURL);

let isPlaying = false;
let isAudioAvailable = false;

const playSong = async () => {
  try {
    await audio.play();
    audio.onended = () => {
      isPlaying = false;
    };

    isPlaying = true;
    render();
  } catch (error) {
    console.error('Failed to play audio: ', error);
  }
};

const pauseSong = () => {
  audio.pause();
  isPlaying = false;
  render();
};

const togglePlay = () => {
  if (isPlaying) {
    pauseSong();
  } else {
    playSong();
  }
};

const render = () => {
  const playIcon = audioPreview.querySelector('#play-icon');
  const svgPathElem = playIcon.querySelector('svg > path');

  if (isAudioAvailable) {
    playIcon.classList.remove('opacity-0');
    playIcon.classList.add('opacity-100');

    if (isPlaying) {
      svgPathElem.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
    } else {
      svgPathElem.setAttribute('d', 'M8 5v14l11-7z');
    }
  } else {
    playIcon.classList.remove('opacity-100');
    playIcon.classList.add('opacity-0');
  }
};

audioPreview.addEventListener('click', () => {
  togglePlay();
});

document.onkeydown = ({ code }) => {
  if (code === 'Space') {
    togglePlay();
  }
};

audio.addEventListener('canplay', () => {
  isAudioAvailable = true;
  render();
});

document.addEventListener('htmx:afterOnLoad', function () {
  if (isAudioAvailable || isPlaying) {
    audio.pause();
    audio.currentTime = 0;
  }
});
