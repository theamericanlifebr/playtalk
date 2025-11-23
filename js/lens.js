(function () {
  const MODE_LENS_COLORS = {
    1: '#2bd67b', // verde
    2: '#f2c84b', // amarelo quente
    3: '#ff9a4d', // laranja
    4: '#4aa3ff', // azul
    5: '#b37bff', // roxo
    6: '#ff5f6d'  // vermelho
  };

  function clampHex(value, fallback = '#2bd67b') {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
  }

  function hexToRgb(hex) {
    const normalized = clampHex(hex, '#2bd67b').replace('#', '');
    const chunk = normalized.length === 3 ? normalized.split('').map(ch => ch + ch).join('') : normalized;
    const num = parseInt(chunk, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function toRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function mixWithWarmth(hex, ratio = 0.12) {
    const { r, g, b } = hexToRgb(hex);
    const warm = { r: 255, g: 210, b: 180 };
    const blend = (channel, warmChannel) => Math.round(channel + (warmChannel - channel) * ratio);
    return `rgb(${blend(r, warm.r)}, ${blend(g, warm.g)}, ${blend(b, warm.b)})`;
  }

  function ensureLensLayer(container) {
    if (!container) return null;
    container.classList.add('has-lens');
    if (!container.style.position || container.style.position === 'static') {
      container.style.position = 'relative';
    }
    let layer = container.querySelector(':scope > .lens-overlay');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'lens-overlay';
      layer.setAttribute('aria-hidden', 'true');
      container.prepend(layer);
    }
    return layer;
  }

  function applyLens(container, options = {}) {
    const layer = ensureLensLayer(container);
    if (!layer) return;
    const { mode, color, visible = true } = options;
    const paletteColor = MODE_LENS_COLORS[mode] || MODE_LENS_COLORS[1];
    const base = clampHex(color || document.documentElement.style.getPropertyValue('--lens-custom-color') || paletteColor, paletteColor);
    const warm = mixWithWarmth(base, 0.2);
    layer.style.setProperty('--lens-start', toRgba(base, 0.65));
    layer.style.setProperty('--lens-end', toRgba(warm, 0.25));
    layer.style.opacity = visible ? '1' : '0';
  }

  function applyLensByMode(container, mode) {
    applyLens(container, { mode: Number(mode) || 1 });
  }

  window.playtalkLens = {
    applyLens,
    applyLensByMode,
    MODE_LENS_COLORS
  };
})();
