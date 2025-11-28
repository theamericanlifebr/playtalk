(function() {
  const MODE_ICON_SVGS = {
    1: `
      <path d="M12 18c0-5.523 4.477-10 10-10h20c5.523 0 10 4.477 10 10v8c0 5.523-4.477 10-10 10H28l-8 8v-8h-6c-5.523 0-10-4.477-10-10Z" opacity="0.92" />
      <path d="M22 20h10v4H22zm14 0h10v4H36zM22 28h18v4H22z" />
    `,
    2: `
      <path d="M18 16h18l-4.5-5L35 8l9 10-9 10-1.5-3 4.5-5H18z" />
      <path d="M46 48H28l4.5 5L27 56l-9-10 9-10 1.5 3-4.5 5h18z" opacity="0.82" />
      <path d="M22 30h8v4h-8zm12 0h4v4h-4z" />
    `,
    3: `
      <path d="M32 10c-11.046 0-20 8.954-20 20v10c0 5.523 4.477 10 10 10h4V34h-8v-4c0-7.732 6.268-14 14-14s14 6.268 14 14v4h-8v16h4c5.523 0 10-4.477 10-10V30c0-11.046-8.954-20-20-20Z" opacity="0.9" />
      <path d="M24 34h4v16h-4a6 6 0 0 1-6-6v-4a6 6 0 0 1 6-6Zm16 0h4a6 6 0 0 1 6 6v4a6 6 0 0 1-6 6h-4z" />
    `,
    4: `
      <path d="M12 16h16c3.866 0 7 3.134 7 7v24c-4-2-8-3-12-3s-8 1-12 3V16Z" opacity="0.92" />
      <path d="M36 23c0-3.866 3.134-7 7-7h9c3.866 0 7 3.134 7 7v24c-4-2-8-3-12-3s-8 1-12 3Z" opacity="0.82" />
      <path d="M18 24h10v3H18zm0 8h10v3H18zm20-8h10v3H38z" />
    `,
    5: `
      <path d="M12 18c0-6.627 5.373-12 12-12h18c6.627 0 12 5.373 12 12v6c0 6.627-5.373 12-12 12h-6l-8 8v-8H24c-6.627 0-12-5.373-12-12Z" opacity="0.9" />
      <path d="M22 20h9v4h-9zm0 8h7v4h-7zm13-8h11v4H35zm0 8h9v4h-9z" />
    `,
    6: `
      <path d="M32 10c-9.941 0-18 8.059-18 18 0 6.77 3.73 12.66 9.26 15.69L22 54l10-4 10 4-1.26-10.31C46.27 40.66 50 34.77 50 28c0-9.941-8.059-18-18-18Z" opacity="0.9" />
      <path d="m32 18 3.09 7.9H43l-6.54 4.75 2.5 7.71L32 34.8l-6.96 3.56 2.5-7.71L21 25.9h7.91Z" opacity="0.8" />
    `
  };

  function renderModeLogo(element, mode) {
    if (!element) {
      return;
    }
    const parsedMode = Number(mode);
    const safeMode = MODE_ICON_SVGS[parsedMode] ? parsedMode : 1;
    element.dataset.mode = String(safeMode);
    element.classList.add('mode-logo');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('mode-logo__icon');
    svg.innerHTML = MODE_ICON_SVGS[safeMode];
    element.innerHTML = '';
    element.appendChild(svg);
  }

  function renderAllModeLogos(root = document) {
    const scope = root || document;
    scope.querySelectorAll('.mode-logo').forEach((logo) => {
      const closestMode = logo.closest('.menu-mode[data-mode], .mode-btn[data-mode]');
      const inherited = closestMode ? Number(closestMode.dataset.mode) : null;
      const mode = Number(logo.dataset.mode) || inherited || 1;
      renderModeLogo(logo, mode);
    });
  }

  function createModeLogoElement(mode, extraClass = '') {
    const el = document.createElement('div');
    el.className = ['mode-logo', extraClass].filter(Boolean).join(' ');
    renderModeLogo(el, mode);
    return el;
  }

  window.playtalkModeLogos = {
    ICONS: MODE_ICON_SVGS,
    renderModeLogo,
    renderAllModeLogos,
    createModeLogoElement
  };
})();
