(function() {
  const DEFAULT_SETTINGS = {
    theme: 'light',
    pointsPerHit: 4000,
    pointsLossPerSecond: 0,
    startingPoints: 0
  };

  function loadSettings() {
    const stored = localStorage.getItem('playtalkSettings');
    if (!stored) return { ...DEFAULT_SETTINGS };
    try {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (err) {
      console.warn('Configurações inválidas, revertendo para padrão.', err);
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem('playtalkSettings', JSON.stringify(settings));
  }

  function applyTheme(theme) {
    const body = document.body;
    if (!body) return;
    body.classList.remove('dark-mode', 'theme-blue');
    switch (theme) {
      case 'dark':
        body.classList.add('dark-mode');
        break;
      case 'blue':
        body.classList.add('theme-blue');
        break;
      default:
        break;
    }
  }

  function applyStoredTheme() {
    const settings = loadSettings();
    applyTheme(settings.theme);
  }

  window.playtalkSettings = {
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettings,
    applyTheme,
    applyStoredTheme
  };

  document.addEventListener('DOMContentLoaded', applyStoredTheme, { once: true });
})();
