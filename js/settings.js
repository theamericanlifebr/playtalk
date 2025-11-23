(function() {
  const SETTINGS_STORAGE_KEY = 'playtalkSettings';
  const DEFAULT_SETTINGS = {
    theme: 'light',
    retryWrongPhrases: false,
    headerGradientStart: '#1a66cc',
    headerGradientEnd: '#357de0',
    headerGradientEnabled: true,
    phraseColor: '',
    lensColor: ''
  };

  function normalizeHexColor(value, fallback = '') {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    const isValidHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
    return isValidHex ? trimmed.toLowerCase() : fallback;
  }

  function getDefaultPhraseColor(theme) {
    if (theme === 'dark' || theme === 'blue') return '#ffffff';
    return '#333333';
  }

  function normalizeSettings(value) {
    const base = { ...DEFAULT_SETTINGS };
    if (!value || typeof value !== 'object') {
      return base;
    }
    const normalized = { ...base };
    if (typeof value.theme === 'string') {
      normalized.theme = value.theme;
    }
    if (typeof value.retryWrongPhrases === 'boolean') {
      normalized.retryWrongPhrases = value.retryWrongPhrases;
    }
    if (value && typeof value === 'object') {
      normalized.headerGradientStart = normalizeHexColor(value.headerGradientStart, DEFAULT_SETTINGS.headerGradientStart);
      normalized.headerGradientEnd = normalizeHexColor(value.headerGradientEnd, DEFAULT_SETTINGS.headerGradientEnd);
      normalized.headerGradientEnabled = Boolean(value.headerGradientEnabled);
      normalized.phraseColor = normalizeHexColor(value.phraseColor, '');
      normalized.lensColor = normalizeHexColor(value.lensColor, '');
    }
    return normalized;
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
    applyVisualPreferences(normalized);
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

  function applyHeaderGradient({ headerGradientStart, headerGradientEnd, headerGradientEnabled } = {}) {
    const doc = document.documentElement;
    if (!doc) return;
    const start = normalizeHexColor(headerGradientStart, DEFAULT_SETTINGS.headerGradientStart);
    const end = normalizeHexColor(headerGradientEnd, DEFAULT_SETTINGS.headerGradientEnd);
    const gradient = headerGradientEnabled === false
      ? start
      : `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
    doc.style.setProperty('--header-gradient-start', start);
    doc.style.setProperty('--header-gradient-end', end);
    doc.style.setProperty('--header-gradient', gradient);
  }

  function applyPhraseColor(color, theme) {
    const doc = document.documentElement;
    if (!doc) return;
    const baseColor = normalizeHexColor(color, '');
    const finalColor = baseColor || getDefaultPhraseColor(theme);
    doc.style.setProperty('--phrase-color', finalColor);
  }

  function applyLensColor(color) {
    const doc = document.documentElement;
    if (!doc) return;
    const normalized = normalizeHexColor(color, '');
    if (normalized) {
      const int = parseInt(normalized.slice(1), 16);
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      doc.style.setProperty('--lens-custom-rgb', `${r}, ${g}, ${b}`);
    } else {
      doc.style.removeProperty('--lens-custom-rgb');
    }
  }

  function applyVisualPreferences(settings = {}) {
    applyTheme(settings.theme);
    applyHeaderGradient(settings);
    applyPhraseColor(settings.phraseColor, settings.theme);
    applyLensColor(settings.lensColor);
  }

  function applyStoredTheme() {
    const settings = loadSettings();
    applyVisualPreferences(settings);
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
    applyHeaderGradient,
    applyPhraseColor,
    applyLensColor,
    applyVisualPreferences,
    applyTheme,
    applyStoredTheme
  };

  window.addEventListener('storage', handleThemeSync);
  window.addEventListener('playtalk:storage-change', handleThemeSync);
  document.addEventListener('playtalk:settings-change', () => handleThemeSync({ key: SETTINGS_STORAGE_KEY }));
  document.addEventListener('DOMContentLoaded', applyStoredTheme, { once: true });
})();

(function() {
  const BACKGROUND_STORAGE_KEY = 'playtalkBackground';
  const MAX_BACKGROUND_SIZE = 40 * 1024 * 1024;
  const ACCEPTED_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'video/mp4'
  ]);
  const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.mp4'];

  function safeParse(value, fallback = null) {
    if (!value) {
      return fallback;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Plano de fundo salvo inválido, limpando configuração.', error);
      return fallback;
    }
  }

  function getExtension(name = '') {
    const idx = name.lastIndexOf('.');
    return idx === -1 ? '' : name.slice(idx).toLowerCase();
  }

  function normalizeConfig(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.src !== 'string' || !raw.src.trim()) {
      return null;
    }
    const type = raw.type === 'video' ? 'video' : 'image';
    return {
      src: raw.src,
      name: typeof raw.name === 'string' ? raw.name : '',
      type
    };
  }

  function readStoredBackground() {
    const stored = safeParse(localStorage.getItem(BACKGROUND_STORAGE_KEY), null);
    return normalizeConfig(stored);
  }

  function persistBackground(config) {
    if (!config) {
      localStorage.removeItem(BACKGROUND_STORAGE_KEY);
      return null;
    }
    const normalized = normalizeConfig(config);
    if (!normalized) {
      localStorage.removeItem(BACKGROUND_STORAGE_KEY);
      return null;
    }
    try {
      localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.warn('Não foi possível salvar o plano de fundo localmente.', error);
    }
    return normalized;
  }

  function ensureBackgroundLayer() {
    if (typeof document === 'undefined') {
      return null;
    }
    let layer = document.getElementById('playtalk-background-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'playtalk-background-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  }

  function clearLayer(layer) {
    if (!layer) {
      return;
    }
    layer.style.backgroundImage = '';
    layer.classList.remove('has-video', 'has-image');
    while (layer.firstChild) {
      layer.removeChild(layer.firstChild);
    }
  }

  function applyBackground(config) {
    if (typeof document === 'undefined') {
      return;
    }
    const layer = ensureBackgroundLayer();
    if (!layer) {
      return;
    }
    clearLayer(layer);
    const validConfig = normalizeConfig(config);
    const active = Boolean(validConfig);
    document.body.classList.toggle('has-custom-background', active);
    if (!active || !validConfig) {
      return;
    }
    if (validConfig.type === 'video') {
      const video = document.createElement('video');
      video.src = validConfig.src;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('aria-hidden', 'true');
      layer.appendChild(video);
      layer.classList.add('has-video');
      requestAnimationFrame(() => {
        video.play().catch(() => {});
      });
      return;
    }
    layer.style.backgroundImage = `url(${validConfig.src})`;
    layer.classList.add('has-image');
  }

  function isAllowedFile(file) {
    if (!file) {
      return false;
    }
    if (file.type && ACCEPTED_TYPES.has(file.type.toLowerCase())) {
      return true;
    }
    return ACCEPTED_EXTENSIONS.includes(getExtension(file.name || ''));
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Não foi possível ler o arquivo selecionado.'));
      };
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
      reader.readAsDataURL(file);
    });
  }

  async function setBackgroundFromFile(file) {
    if (!file) {
      throw new Error('Selecione um arquivo para continuar.');
    }
    if (!isAllowedFile(file)) {
      throw new Error('Use uma imagem JPG/PNG ou vídeo MP4.');
    }
    if (file.size > MAX_BACKGROUND_SIZE) {
      throw new Error('O limite é de 40 MB. Escolha um arquivo menor.');
    }
    const dataUrl = await readFileAsDataURL(file);
    const type = (file.type && file.type.startsWith('video')) || getExtension(file.name) === '.mp4'
      ? 'video'
      : 'image';
    const config = {
      src: dataUrl,
      name: file.name || '',
      type
    };
    const stored = persistBackground(config);
    applyBackground(stored);
    return stored;
  }

  function clearBackground() {
    persistBackground(null);
    applyBackground(null);
  }

  function applyStoredBackground() {
    const config = readStoredBackground();
    applyBackground(config);
    return config;
  }

  window.playtalkBackground = {
    applyStoredBackground,
    setFromFile: setBackgroundFromFile,
    clear: clearBackground,
    getConfig: readStoredBackground,
    getMaxSize: () => MAX_BACKGROUND_SIZE
  };

  document.addEventListener('DOMContentLoaded', applyStoredBackground, { once: true });
  window.addEventListener('storage', (event) => {
    if (event.key === BACKGROUND_STORAGE_KEY) {
      applyBackground(normalizeConfig(safeParse(event.newValue, null)));
    }
  });
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
