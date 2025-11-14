(function() {
  const storage = window.playtalkStorage;
  const DEFAULT_SETTINGS = {
    theme: 'light',
    pointsPerHit: 4000,
    pointsLossPerSecond: 0,
    startingPoints: 0
  };

  function loadSettings() {
    const stored = storage.getItem('playtalkSettings');
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
    storage.setItem('playtalkSettings', JSON.stringify(settings));
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

(function() {
  const registry = {};

  function ensureArray(value) {
    return Array.isArray(value) ? value : [value];
  }

  function normalizePageClass(pageClass) {
    if (!pageClass) {
      return [];
    }
    return ensureArray(pageClass).map(entry => String(entry).trim()).filter(Boolean);
  }

  function invokeInitializer(entry, context) {
    if (!entry || typeof entry.init !== 'function') {
      return;
    }
    if (typeof entry.cleanup === 'function') {
      try {
        entry.cleanup();
      } catch (error) {
        console.warn('Falha ao limpar página anterior:', error);
      }
      entry.cleanup = null;
    }
    try {
      const possibleCleanup = entry.init(context || {});
      if (typeof possibleCleanup === 'function') {
        entry.cleanup = possibleCleanup;
      }
    } catch (error) {
      console.error('Erro ao inicializar página:', error);
    }
  }

  function bodyHasClass(pageClass) {
    const body = document.body;
    return Boolean(body && body.classList.contains(pageClass));
  }

  window.runPlaytalkPage = function(pageClass, context) {
    const classes = normalizePageClass(pageClass);
    classes.forEach(key => {
      const entry = registry[key];
      if (entry) {
        invokeInitializer(entry, context);
      }
    });
  };

  window.registerPlaytalkPage = function(pageClass, initFn) {
    const classes = normalizePageClass(pageClass);
    if (!classes.length || typeof initFn !== 'function') {
      return;
    }
    classes.forEach(key => {
      registry[key] = registry[key] || { init: initFn, cleanup: null };
      registry[key].init = initFn;
    });

    const maybeRun = () => {
      classes.forEach(key => {
        if (bodyHasClass(key)) {
          window.runPlaytalkPage(key);
        }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', maybeRun, { once: true });
    } else {
      maybeRun();
    }
  };
})();
