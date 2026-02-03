(function () {
  const settingsApi = window.playtalkSettings;
  if (!settingsApi) return;

  const FONT_OPTIONS = [
    'Open Sans',
    'Aver',
    'Bronaco',
    'Colombia',
    'Enceladus',
    'Enceladus Regular',
    'Gealid Light',
    'Gealit',
    'Glametrix',
    'Glametrix Light',
    'Glametrix Feather',
    'Gotama',
    'Hadir Sans',
    'Kimberry',
    'Liscence Plate',
    'Metropolis',
    'Momcake',
    'Momcake Thin',
    'Munich Regular',
    'Newspappe',
    'Titillium Web Semibold',
    'Tittilum',
    'Venus Light',
    'Venus YG'
  ];

  const fontSelect = document.getElementById('gameFontSelect');
  const fontColor = document.getElementById('gameFontColor');
  const musicToggle = document.getElementById('gameMusicToggle');
  const backgroundUpload = document.getElementById('gameBackgroundUpload');
  const backgroundPreview = document.getElementById('gameBackgroundPreview');
  const backgroundClear = document.getElementById('gameBackgroundClear');
  const status = document.getElementById('gameOptionsStatus');

  if (!fontSelect || !fontColor || !musicToggle || !backgroundUpload || !backgroundPreview || !backgroundClear || !status) {
    return;
  }

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('game-options-status--error', isError);
  }

  function renderFontOptions(currentValue) {
    fontSelect.innerHTML = '';
    FONT_OPTIONS.forEach((font) => {
      const option = document.createElement('option');
      option.value = font;
      option.textContent = font;
      option.style.fontFamily = `'${font}', 'Open Sans', sans-serif`;
      if (font === currentValue) {
        option.selected = true;
      }
      fontSelect.appendChild(option);
    });
  }

  function renderBackgroundPreview({ gameBackgroundType, gameBackgroundData }) {
    backgroundPreview.innerHTML = '';
    if (!gameBackgroundType || !gameBackgroundData) {
      backgroundPreview.innerHTML = '<span>Nenhum background selecionado.</span>';
      return;
    }
    if (gameBackgroundType === 'image') {
      const img = document.createElement('img');
      img.src = gameBackgroundData;
      img.alt = 'Prévia do background selecionado';
      backgroundPreview.appendChild(img);
      return;
    }
    if (gameBackgroundType === 'video') {
      const video = document.createElement('video');
      video.src = gameBackgroundData;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      backgroundPreview.appendChild(video);
    }
  }

  function updateSettings(partial) {
    const current = settingsApi.loadSettings();
    settingsApi.saveSettings({
      ...current,
      ...partial
    });
  }

  function normalizeColor(value, fallback = '#ffffff') {
    if (!value) return fallback;
    return value.startsWith('#') ? value : fallback;
  }

  function handleUpload(file) {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (!validTypes.includes(file.type)) {
      setStatus('Formato inválido. Use JPG, PNG ou MP4.', true);
      backgroundUpload.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      updateSettings({
        gameBackgroundType: type,
        gameBackgroundData: reader.result
      });
      renderBackgroundPreview({
        gameBackgroundType: type,
        gameBackgroundData: reader.result
      });
      setStatus('Background atualizado com sucesso!');
    };
    reader.onerror = () => {
      setStatus('Não foi possível carregar este arquivo.', true);
    };
    reader.readAsDataURL(file);
  }

  function hydrate() {
    const settings = settingsApi.loadSettings();
    renderFontOptions(settings.gameFont || settingsApi.DEFAULT_SETTINGS.gameFont);
    fontColor.value = normalizeColor(settings.gamePhraseColor, settingsApi.DEFAULT_SETTINGS.gamePhraseColor);
    musicToggle.checked = settings.musicEnabled !== false;
    renderBackgroundPreview(settings);
  }

  fontSelect.addEventListener('change', (event) => {
    updateSettings({ gameFont: event.target.value });
  });

  fontColor.addEventListener('input', (event) => {
    updateSettings({ gamePhraseColor: event.target.value });
  });

  musicToggle.addEventListener('change', (event) => {
    updateSettings({ musicEnabled: event.target.checked });
  });

  backgroundUpload.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    handleUpload(file);
  });

  backgroundClear.addEventListener('click', () => {
    updateSettings({ gameBackgroundType: '', gameBackgroundData: '' });
    renderBackgroundPreview({ gameBackgroundType: '', gameBackgroundData: '' });
    setStatus('Background removido.');
  });

  document.addEventListener('DOMContentLoaded', hydrate, { once: true });
})();
