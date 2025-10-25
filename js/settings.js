(function() {
  const DEFAULT_SETTINGS = {
    theme: 'light',
    pointsPerHit: 4000,
    pointsLossPerSecond: 0,
    startingPoints: 0
  };

  const NAV_ORDER = ['index.html', 'fun.html', 'play.html', 'custom.html', 'ranking.html', 'perfil.html'];

  let isTransitioning = false;
  let touchStartX = null;
  let touchStartY = null;
  let touchActive = false;

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

  function updateHeaderOffset() {
    const header = document.getElementById('global-header');
    const body = document.body;
    if (!body) return;
    const height = header && header.offsetParent !== null ? header.offsetHeight : 0;
    body.style.setProperty('--header-offset', `${height}px`);
  }

  function runPageEnterAnimation() {
    const body = document.body;
    if (!body) return;
    body.classList.remove('page-transition--exit');
    body.classList.add('page-transition--enter');
    const onAnimationEnd = (event) => {
      if (event.animationName === 'page-slide-in') {
        body.classList.remove('page-transition--enter');
        body.removeEventListener('animationend', onAnimationEnd);
      }
    };
    body.addEventListener('animationend', onAnimationEnd);
  }

  function getCurrentSlug() {
    const path = window.location.pathname.split('/').pop();
    if (!path || path === '/') {
      return 'index.html';
    }
    return path;
  }

  function getAdjacentSlug(direction) {
    const slug = getCurrentSlug();
    const index = NAV_ORDER.indexOf(slug);
    if (index === -1) {
      return null;
    }
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= NAV_ORDER.length) {
      return null;
    }
    return NAV_ORDER[nextIndex];
  }

  function navigateWithTransition(targetUrl) {
    if (!targetUrl || isTransitioning) {
      return;
    }
    const body = document.body;
    if (!body) {
      window.location.href = targetUrl;
      return;
    }
    const currentSlug = getCurrentSlug();
    const absoluteTarget = document.createElement('a');
    absoluteTarget.href = targetUrl;
    const nextSlug = absoluteTarget.pathname.split('/').pop() || targetUrl;
    if (nextSlug === currentSlug) {
      return;
    }
    isTransitioning = true;
    body.classList.remove('page-transition--enter');
    body.classList.add('page-transition--exit');
    const finish = () => {
      window.location.href = targetUrl;
    };
    const onAnimationEnd = (event) => {
      if (event.animationName === 'page-slide-out') {
        body.removeEventListener('animationend', onAnimationEnd);
        finish();
      }
    };
    body.addEventListener('animationend', onAnimationEnd);
    setTimeout(finish, 420);
  }

  function handleLinkClick(event) {
    if (event.defaultPrevented) {
      return;
    }
    const anchor = event.target.closest('a');
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) {
      return;
    }
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) {
      return;
    }
    const anchorUrl = new URL(href, window.location.href);
    if (anchorUrl.origin !== window.location.origin) {
      return;
    }
    event.preventDefault();
    navigateWithTransition(anchorUrl.pathname + anchorUrl.search + anchorUrl.hash);
  }

  function handleTouchStart(event) {
    if (window.innerWidth > 768 || event.touches.length !== 1) {
      touchActive = false;
      return;
    }
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchActive = true;
  }

  function handleTouchEnd(event) {
    if (!touchActive || event.changedTouches.length === 0) {
      return;
    }
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    touchActive = false;
    if (Math.abs(deltaX) < 80 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }
    const direction = deltaX > 0 ? -1 : 1;
    const nextSlug = getAdjacentSlug(direction);
    if (nextSlug) {
      navigateWithTransition(nextSlug);
    }
  }

  function handleTouchCancel() {
    touchActive = false;
  }

  function initLayout() {
    applyStoredTheme();
    updateHeaderOffset();
    runPageEnterAnimation();
    document.addEventListener('click', handleLinkClick);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchCancel);
    window.addEventListener('resize', updateHeaderOffset);
    document.addEventListener('playtalk:user-change', updateHeaderOffset);
    document.addEventListener('playtalk:level-update', updateHeaderOffset);
    document.addEventListener('playtalk:layout-change', updateHeaderOffset);
  }

  window.playtalkSettings = {
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettings,
    applyTheme,
    applyStoredTheme
  };

  document.addEventListener('DOMContentLoaded', initLayout, { once: true });
})();
