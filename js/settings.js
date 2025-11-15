(function() {
  const SETTINGS_STORAGE_KEY = 'playtalkSettings';
  const DEFAULT_SETTINGS = {
    theme: 'light',
    pointsPerHit: 4000,
    pointsLossPerSecond: 0,
    startingPoints: 0
  };

  function normalizeSettings(value) {
    if (!value || typeof value !== 'object') {
      return { ...DEFAULT_SETTINGS };
    }
    return {
      ...DEFAULT_SETTINGS,
      ...value
    };
  }

  function loadSettings() {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    try {
      const parsed = JSON.parse(stored);
      return normalizeSettings(parsed);
    } catch (err) {
      console.warn('Configurações inválidas, revertendo para padrão.', err);
      return { ...DEFAULT_SETTINGS };
    }
  }

  function notifySettingsChange(settings) {
    try {
      document.dispatchEvent(new CustomEvent('playtalk:settings-change', {
        detail: { settings: { ...settings } }
      }));
    } catch (error) {
      console.warn('Não foi possível emitir evento de configurações:', error);
    }
  }

  function saveSettings(settings) {
    const normalized = normalizeSettings(settings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    } catch (err) {
      console.warn('Não foi possível salvar as configurações.', err);
    }
    notifySettingsChange(normalized);
    if (window.playtalkAuth && typeof window.playtalkAuth.persistProgress === 'function') {
      window.playtalkAuth.persistProgress();
    }
    return normalized;
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

  function handleThemeSync(event) {
    const key = event && (event.key || (event.detail && event.detail.key));
    if (!key || key === SETTINGS_STORAGE_KEY) {
      requestAnimationFrame(applyStoredTheme);
    }
  }

  window.playtalkSettings = {
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettings,
    applyTheme,
    applyStoredTheme
  };

  window.addEventListener('storage', handleThemeSync);
  window.addEventListener('playtalk:storage-change', handleThemeSync);
  document.addEventListener('playtalk:settings-change', () => handleThemeSync({ key: SETTINGS_STORAGE_KEY }));
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
