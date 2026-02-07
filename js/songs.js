(function() {
  const CHUNK_SECONDS = 30;
  const BITRATE = 128000; // bits per second
  const CHUNK_BYTES = Math.floor(BITRATE / 8 * CHUNK_SECONDS);
  const resolveGameSound = typeof window.getGameSoundUrl === 'function'
    ? window.getGameSoundUrl
    : path => `gamesounds/${path}`;
  const songs = [
    'letsplay.mp3',
    'letsplay2.mp3',
    'mode1first.mp3',
    'mode2first.mp3',
    'mode3first.mp3',
    'mode4first.mp3',
    'mode5first.mp3',
    'mode6first.mp3',
    'nextlevel.mp3',
    'success.mp3',
    'error.mp3',
    'welcome.mp3'
  ].map(resolveGameSound);
  const cache = {};
  let current = null;

  function setBufferWidth(percent) {
    const buffer = document.getElementById('barra-buffer');
    const playBar = document.getElementById('barra-preenchida');
    if (!buffer || !playBar) return;
    buffer.style.width = percent + '%';
    buffer.style.backgroundColor = getComputedStyle(playBar).backgroundColor;
  }

  function storeFull(url, blob) {
    const reader = new FileReader();
    reader.onloadend = () => localStorage.setItem('song_' + url, reader.result);
    reader.readAsDataURL(blob);
  }

  function preload(url) {
    if (localStorage.getItem('song_' + url)) {
      cache[url] = {
        audio: new Audio(localStorage.getItem('song_' + url)),
        loaded: true
      };
      return Promise.resolve();
    }
    return fetch(url, { headers: { Range: `bytes=0-${CHUNK_BYTES - 1}` } })
      .then(r => r.arrayBuffer())
      .then(buf => {
        const blob = new Blob([buf]);
        const audio = new Audio(URL.createObjectURL(blob));
        cache[url] = {
          audio,
          firstChunk: buf,
          loadedBytes: buf.byteLength,
          loaded: false
        };
        audio.addEventListener('loadedmetadata', () => {
          const percent = Math.min(CHUNK_SECONDS / audio.duration, 1) * 100;
          setBufferWidth(percent);
        });
        const reader = new FileReader();
        reader.onloadend = () => localStorage.setItem('song_' + url + '_part', reader.result);
        reader.readAsDataURL(blob);
      });
  }

  function play(url) {
    const entry = cache[url];
    if (!entry) return;
    const audio = entry.audio;
    current = entry;
    audio.play();
    audio.addEventListener('timeupdate', function onTime() {
      if (!entry.loaded && audio.currentTime > CHUNK_SECONDS - 5) {
        entry.loaded = true;
        fetch(url, { headers: { Range: `bytes=${entry.loadedBytes}-` } })
          .then(r => r.arrayBuffer())
          .then(rest => {
            const fullBlob = new Blob([entry.firstChunk, rest]);
            const pos = audio.currentTime;
            audio.src = URL.createObjectURL(fullBlob);
            audio.currentTime = pos;
            setBufferWidth(100);
            storeFull(url, fullBlob);
          });
      }
      if (audio.duration) {
        const buffered = entry.loaded ? audio.duration : Math.min(CHUNK_SECONDS, audio.duration);
        setBufferWidth(buffered / audio.duration * 100);
      }
    });
  }

  function fadeOut(audio) {
    const step = audio.volume / 30;
    const fade = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - step);
      if (audio.volume <= 0) {
        clearInterval(fade);
        audio.pause();
        audio.volume = 1;
      }
    }, 100);
  }

  function pause() {
    if (current) {
      fadeOut(current.audio);
    }
  }

  window.SongPlayer = { play, pause };

  document.addEventListener('DOMContentLoaded', () => {
    songs.forEach(preload);
  });
})();
