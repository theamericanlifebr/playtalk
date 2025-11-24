(function() {
  const MODE_COLORS = {
    1: '#b22a1c', // vermelho queimado
    2: '#c4451c', // laranja escuro
    3: '#d06b1f', // âmbar profundo
    4: '#a23c28', // terracota
    5: '#8c2f3a', // vinho quente
    6: '#7a1f2b'  // rubi fechado
  };

  const CONTEXT_COLORS = {
    home: '#0d8d9d',
    game: '#0d8d9d',
    menus: '#0a1f44',
    profile: '#0b2f5b',
    stats: '#000000'
  };

  let overlay = null;
  let activeMode = null;

  function hexToRgb(hex) {
    const value = parseInt(hex.slice(1), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `${r}, ${g}, ${b}`;
  }

  function readCustomLensRgb(mode) {
    try {
      const settings = window.playtalkSettings && window.playtalkSettings.loadSettings
        ? window.playtalkSettings.loadSettings()
        : null;
      if (settings) {
        if (settings.lensColors && mode && settings.lensColors[String(mode)]) {
          return hexToRgb(settings.lensColors[String(mode)]);
        }
        if (settings.lensColor) {
          return hexToRgb(settings.lensColor);
        }
      }
    } catch (error) {
      console.warn('Não foi possível aplicar a cor da lente salva.', error);
    }
    const cssCustom = getComputedStyle(document.documentElement).getPropertyValue('--lens-custom-rgb');
    if (cssCustom && cssCustom.trim()) {
      return cssCustom.trim();
    }
    return null;
  }

  function readContextLensRgb(mode) {
    const doc = document.documentElement;
    if (!mode || !doc) return null;
    const cssValue = getComputedStyle(doc).getPropertyValue(`--lens-color-${mode}-rgb`);
    if (cssValue && cssValue.trim()) {
      return cssValue.trim();
    }
    const fallback = CONTEXT_COLORS[mode];
    return fallback ? hexToRgb(fallback) : null;
  }

  function getColorForMode(mode) {
    if (mode && !MODE_COLORS[mode]) {
      const contextual = readContextLensRgb(String(mode));
      if (contextual) {
        return contextual;
      }
    }
    const custom = readCustomLensRgb(mode);
    if (custom) {
      return custom;
    }
    const color = MODE_COLORS[mode] || MODE_COLORS[1];
    return hexToRgb(color);
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'lens-overlay';
    const body = document.body;
    if (body.firstChild) {
      body.insertBefore(overlay, body.firstChild);
    } else {
      body.appendChild(overlay);
    }
    return overlay;
  }

  function applyLens(mode) {
    activeMode = mode || activeMode || 1;
    const ov = ensureOverlay();
    const rgb = getColorForMode(activeMode);
    ov.style.setProperty('--lens-color-rgb', rgb);
    ov.dataset.active = 'true';
  }

  function hideLens() {
    if (!overlay) return;
    overlay.dataset.active = 'false';
  }

  function refreshLens() {
    if (overlay && overlay.dataset.active === 'true') {
      applyLens(activeMode);
    }
  }

  function applyBodyContextLens() {
    const context = document.body && document.body.dataset && document.body.dataset.lensContext;
    if (context) {
      applyLens(context);
    }
  }

  window.playtalkLens = {
    applyLens,
    hideLens,
    refreshLens,
    getColorForMode,
    MODE_COLORS
  };

  document.addEventListener('playtalk:settings-change', refreshLens);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBodyContextLens, { once: true });
  } else {
    applyBodyContextLens();
  }
})();
