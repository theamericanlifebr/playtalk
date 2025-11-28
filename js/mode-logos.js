(function() {
  const DEFAULT_ICON_MARKUP = `
    <g transform="translate(6.4 6.4) scale(0.8)">
      <path d="M12 18c0-5.523 4.477-10 10-10h20c5.523 0 10 4.477 10 10v8c0 5.523-4.477 10-10 10H28l-8 8v-8h-6c-5.523 0-10-4.477-10-10Z" opacity="0.92" />
      <path d="M22 20h10v4H22zm14 0h10v4H36zM22 28h18v4H22z" />
    </g>
  `;

  const MODE_ICON_SOURCES = {
    1: { href: 'SVG/vocabulary.svg' },
    2: { href: 'SVG/explore.svg' },
    3: {
      markup: `
        <g transform="translate(6.4 6.4) scale(0.8)">
          <path d="M32 10c-11.046 0-20 8.954-20 20v10c0 5.523 4.477 10 10 10h4V34h-8v-4c0-7.732 6.268-14 14-14s14 6.268 14 14v4h-8v16h4c5.523 0 10-4.477 10-10V30c0-11.046-8.954-20-20-20Z" opacity="0.9" />
          <path d="M24 34h4v16h-4a6 6 0 0 1-6-6v-4a6 6 0 0 1 6-6Zm16 0h4a6 6 0 0 1 6 6v4a6 6 0 0 1-6 6h-4z" />
        </g>
      `
    },
    4: { href: 'SVG/reading.svg' },
    5: { href: 'SVG/building.svg' },
    6: { href: 'SVG/fluent.svg' }
  };

  function renderModeLogo(element, mode) {
    if (!element) {
      return;
    }
    const parsedMode = Number(mode);
    const safeMode = MODE_ICON_SOURCES[parsedMode] ? parsedMode : 1;
    element.dataset.mode = String(safeMode);
    element.classList.add('mode-logo');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('mode-logo__icon');
    const source = MODE_ICON_SOURCES[safeMode] || {};
    svg.innerHTML = '';
    if (source.href) {
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.setAttribute('href', source.href);
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', source.href);
      image.setAttribute('x', '0');
      image.setAttribute('y', '0');
      image.setAttribute('width', '100%');
      image.setAttribute('height', '100%');
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.appendChild(image);
    } else {
      svg.innerHTML = source.markup || DEFAULT_ICON_MARKUP;
    }
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
    ICONS: MODE_ICON_SOURCES,
    renderModeLogo,
    renderAllModeLogos,
    createModeLogoElement
  };
})();
