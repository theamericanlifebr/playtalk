(function() {
  const SETTINGS_STORAGE_KEY = 'playtalkSettings';
  const SUPPORTED_LENS_KEYS = ['1', '2', '3', '4', '5', '6', 'home', 'game', 'menus', 'profile', 'stats'];
  const DEFAULT_SETTINGS = {
    theme: 'dark',
    headerGradientStart: '#1a66cc',
    headerGradientEnd: '#357de0',
    headerGradientEnabled: true,
    appFont: 'Open Sans',
    gameFont: 'Open Sans',
    appTextColor: '',
    gamePhraseColor: '#ffffff',
    musicEnabled: true,
    gameBackgroundType: '',
    gameBackgroundData: '',
    modeIconColor: '#0b1f44',
    modeIconOpacity: 1,
    buttonColor: '#3b82f6',
    lensColor: '',
    lensColors: {},
    lensOpacityStrong: 0,
    lensOpacitySoft: 0
  };
  let zoomLockInstalled = false;

  function normalizeHexColor(value, fallback = '') {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    const isValidHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
    return isValidHex ? trimmed.toLowerCase() : fallback;
  }

  function toRgbString(color) {
    const normalized = normalizeHexColor(color, '');
    if (!normalized) {
      return null;
    }
    const int = parseInt(normalized.slice(1), 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `${r}, ${g}, ${b}`;
  }

  function toRgbTuple(color) {
    const normalized = normalizeHexColor(color, '');
    if (!normalized) return null;
    const int = parseInt(normalized.slice(1), 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }

  function rgbToHex([r, g, b]) {
    return `#${[r, g, b]
      .map((value) => Math.max(0, Math.min(255, value)))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')}`;
  }

  function lightenRgb(rgb = [0, 0, 0], factor = 0.2) {
    return rgb.map((value) => Math.round(value + (255 - value) * factor));
  }

  function getDefaultPhraseColor(theme) {
    return '#ffffff';
  }

  function normalizeSettings(value) {
    const base = { ...DEFAULT_SETTINGS };
    if (!value || typeof value !== 'object') {
      return base;
    }
    const normalized = { ...base };
    normalized.theme = 'dark';
    if (value && typeof value === 'object') {
      normalized.headerGradientStart = normalizeHexColor(value.headerGradientStart, DEFAULT_SETTINGS.headerGradientStart);
      normalized.headerGradientEnd = normalizeHexColor(value.headerGradientEnd, DEFAULT_SETTINGS.headerGradientEnd);
      normalized.headerGradientEnabled = Boolean(value.headerGradientEnabled);
      normalized.appFont = normalizeFont(value.appFont || value.appFontFamily, DEFAULT_SETTINGS.appFont);
      normalized.gameFont = normalizeFont(value.gameFont || value.gameFontFamily, DEFAULT_SETTINGS.gameFont);
      normalized.appTextColor = normalizeHexColor(value.appTextColor, '');
      normalized.gamePhraseColor = normalizeHexColor(
        value.gamePhraseColor || value.phraseColor,
        DEFAULT_SETTINGS.gamePhraseColor
      );
      normalized.musicEnabled = typeof value.musicEnabled === 'boolean' ? value.musicEnabled : DEFAULT_SETTINGS.musicEnabled;
      normalized.gameBackgroundType = typeof value.gameBackgroundType === 'string' ? value.gameBackgroundType : '';
      normalized.gameBackgroundData = typeof value.gameBackgroundData === 'string' ? value.gameBackgroundData : '';
      normalized.lensColor = normalizeHexColor(value.lensColor, '');
      normalized.lensColors = normalizeLensPalette(value.lensColors);
      normalized.lensOpacityStrong = normalizeOpacity(value.lensOpacityStrong, DEFAULT_SETTINGS.lensOpacityStrong);
      normalized.lensOpacitySoft = normalizeOpacity(value.lensOpacitySoft, DEFAULT_SETTINGS.lensOpacitySoft);
    }
    return normalized;
  }

  function normalizeOpacity(value, fallback = 0.5) {
    const num = Number(value);
    if (!Number.isFinite(num)) return Math.max(0, Math.min(1, fallback));
    return Math.max(0, Math.min(1, num));
  }

  function normalizeLensPalette(raw) {
    const palette = {};
    if (!raw || typeof raw !== 'object') {
      return palette;
    }
    SUPPORTED_LENS_KEYS.forEach((key) => {
      const custom = normalizeHexColor(raw[key], '');
      if (custom) {
        palette[key] = custom;
      }
    });
    return palette;
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
    return normalized;
  }

  function lockDesktopZoom() {
    if (zoomLockInstalled) {
      return;
    }
    const isDesktop = window.matchMedia('(pointer: fine)').matches && !/Mobi/i.test(navigator.userAgent || '');
    if (!isDesktop) {
      return;
    }
    const preventZoomEvent = (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };
    window.addEventListener('wheel', preventZoomEvent, { passive: false });
    window.addEventListener('keydown', (event) => {
      const zoomKeys = ['+', '-', '=', '_'];
      if ((event.ctrlKey || event.metaKey) && zoomKeys.includes(event.key)) {
        event.preventDefault();
      }
    });
    zoomLockInstalled = true;
  }

  function applyTheme(theme) {
    const body = document.body;
    if (!body) return;
    body.classList.remove('dark-mode', 'theme-blue');
    if (theme === 'dark') {
      body.classList.add('dark-mode');
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
    applyGamePhraseColor(color, theme);
  }

  function applyLensColor(color) {
    const doc = document.documentElement;
    if (!doc) return;
    const rgb = toRgbString(color);
    if (rgb) {
      doc.style.setProperty('--lens-custom-rgb', rgb);
    } else {
      doc.style.removeProperty('--lens-custom-rgb');
    }
  }

  function applyModeIconColor(color) {
    const doc = document.documentElement;
    if (!doc) return;
    const normalized = normalizeHexColor(color, DEFAULT_SETTINGS.modeIconColor);
    doc.style.setProperty('--mode-icon-color', normalized);
  }

  function applyModeIconOpacity(opacity) {
    const doc = document.documentElement;
    if (!doc) return;
    const normalized = normalizeOpacity(opacity, DEFAULT_SETTINGS.modeIconOpacity);
    doc.style.setProperty('--mode-icon-opacity', String(normalized));
  }

  function applyButtonColor(color) {
    const doc = document.documentElement;
    if (!doc) return;
    const normalized = normalizeHexColor(color, DEFAULT_SETTINGS.buttonColor);
    const rgb = toRgbTuple(normalized) || [59, 130, 246];
    const contrast = rgbToHex(lightenRgb(rgb, 0.35));
    doc.style.setProperty('--button-color-base', normalized || '#3b82f6');
    doc.style.setProperty('--button-color-contrast', contrast);
    doc.style.setProperty('--button-shadow', `rgba(${rgb.join(', ')}, 0.35)`);
  }

  function normalizeFont(value, fallback = DEFAULT_SETTINGS.appFont) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  function applyAppFont(font) {
    const doc = document.documentElement;
    if (!doc) return;
    const normalized = normalizeFont(font, DEFAULT_SETTINGS.appFont);
    doc.style.setProperty('--app-font-family', normalized);
  }

  function applyGameFont(font) {
    const doc = document.documentElement;
    if (!doc) return;
    const normalized = normalizeFont(font, DEFAULT_SETTINGS.gameFont);
    doc.style.setProperty('--game-phrase-font-family', normalized);
  }

  function applyAppTextColor(color) {
    const doc = document.documentElement;
    const body = document.body;
    if (!doc) return;
    const normalized = normalizeHexColor(color, '');
    const fallback = '#ffffff';
    if (normalized) {
      doc.style.setProperty('--app-text-color', normalized);
      body && body.classList.add('has-custom-text-color');
    } else {
      doc.style.setProperty('--app-text-color', fallback);
      body && body.classList.remove('has-custom-text-color');
    }
  }

  function applyGamePhraseColor(color, theme) {
    const doc = document.documentElement;
    if (!doc) return;
    const normalized = normalizeHexColor(color, DEFAULT_SETTINGS.gamePhraseColor) || getDefaultPhraseColor(theme);
    doc.style.setProperty('--game-phrase-color', normalized);
    doc.style.setProperty('--phrase-color', normalized);
  }

  function applyAudioEnabled(enabled) {
    const audioEnabled = enabled !== false;
    const doc = document.documentElement;
    if (!doc) return;
    doc.dataset.audioEnabled = audioEnabled ? 'true' : 'false';
    document.querySelectorAll('audio').forEach((audio) => {
      audio.muted = !audioEnabled;
      if (!audioEnabled) {
        audio.pause();
      }
    });
  }

  function ensureGameBackgroundContainer() {
    let container = document.getElementById('game-background');
    if (!container) {
      container = document.createElement('div');
      container.id = 'game-background';
      container.className = 'game-background';
      document.body && document.body.prepend(container);
    }
    return container;
  }

  function applyGameBackground({ gameBackgroundType, gameBackgroundData } = {}) {
    const body = document.body;
    if (!body) return;
    const type = typeof gameBackgroundType === 'string' ? gameBackgroundType : '';
    const data = typeof gameBackgroundData === 'string' ? gameBackgroundData : '';
    const hasBackground = Boolean(type && data);
    body.classList.toggle('has-game-background', hasBackground);

    const container = ensureGameBackgroundContainer();
    container.innerHTML = '';
    if (!hasBackground) {
      container.style.removeProperty('background-image');
      return;
    }
    if (type === 'image') {
      container.style.backgroundImage = `url('${data}')`;
      return;
    }
    if (type === 'video') {
      const video = document.createElement('video');
      video.className = 'game-background__video';
      video.src = data;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      container.appendChild(video);
    }
  }

  function applyContextLensColors(lensColors = {}, fallbackColor = '') {
    const doc = document.documentElement;
    if (!doc || !lensColors || typeof lensColors !== 'object') return;
    const fallbackRgb = toRgbString(fallbackColor);
    SUPPORTED_LENS_KEYS.forEach((key) => {
      const rgb = toRgbString(lensColors[key]) || fallbackRgb;
      const prop = `--lens-color-${key}-rgb`;
      if (rgb) {
        doc.style.setProperty(prop, rgb);
      } else {
        doc.style.removeProperty(prop);
      }
    });
  }

  function applyLensOpacity(strong, soft) {
    const doc = document.documentElement;
    if (!doc) return;
    const strongValue = normalizeOpacity(strong, DEFAULT_SETTINGS.lensOpacityStrong);
    const softValue = normalizeOpacity(soft, DEFAULT_SETTINGS.lensOpacitySoft);
    doc.style.setProperty('--lens-opacity-strong', String(strongValue));
    doc.style.setProperty('--lens-opacity-soft', String(softValue));
  }

  function applyVisualPreferences(settings = {}) {
    applyTheme(settings.theme);
    applyHeaderGradient(settings);
    applyAppFont(settings.appFont);
    applyGameFont(settings.gameFont);
    applyAppTextColor(settings.appTextColor);
    applyGamePhraseColor(settings.gamePhraseColor, settings.theme);
    applyAudioEnabled(settings.musicEnabled);
    applyGameBackground(settings);
    applyModeIconColor(settings.modeIconColor);
    applyModeIconOpacity(settings.modeIconOpacity);
    applyButtonColor(settings.buttonColor);
    applyLensColor(settings.lensColor);
    applyContextLensColors(settings.lensColors, settings.lensColor);
    applyLensOpacity(settings.lensOpacityStrong, settings.lensOpacitySoft);
  }

  function applyStoredTheme() {
    const settings = loadSettings();
    applyVisualPreferences(settings);
    lockDesktopZoom();
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
    applyGamePhraseColor,
    applyAppTextColor,
    applyAppFont,
    applyGameFont,
    applyLensColor,
    applyAudioEnabled,
    applyGameBackground,
    applyModeIconColor,
    applyModeIconOpacity,
    applyButtonColor,
    applyLensOpacity,
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
