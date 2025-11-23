(function() {
  const MODE_COLORS = {
    1: '#3fd286', // verde
    2: '#f2c11f', // amarelo quente
    3: '#ff8b3d', // laranja
    4: '#4a9cff', // azul
    5: '#9a6dff', // roxo
    6: '#ff4f6d'  // vermelho
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

  function readCustomLensRgb() {
    try {
      const settings = window.playtalkSettings && window.playtalkSettings.loadSettings
        ? window.playtalkSettings.loadSettings()
        : null;
      if (settings && settings.lensColor) {
        return hexToRgb(settings.lensColor);
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

  function getColorForMode(mode) {
    const custom = readCustomLensRgb();
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

  window.playtalkLens = {
    applyLens,
    hideLens,
    refreshLens,
    getColorForMode,
    MODE_COLORS
  };

  document.addEventListener('playtalk:settings-change', refreshLens);
})();
