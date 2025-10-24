(function () {
  const NAV_ORDER = ['index.html', 'fun.html', 'play.html', 'custom.html', 'ranking.html', 'perfil.html'];
  const STORAGE_KEY = 'playtalk:lastTransitionDirection';
  const EXIT_DELAY = 360;

  function normalizePath(path) {
    if (!path) {
      return 'index.html';
    }
    try {
      const url = new URL(path, window.location.origin);
      const last = url.pathname.split('/').pop();
      return last && last.trim() ? last.trim().toLowerCase() : 'index.html';
    } catch (err) {
      const hashIndex = path.indexOf('#');
      const clean = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
      const parts = clean.split('/');
      const last = parts.pop();
      return last && last.trim() ? last.trim().toLowerCase() : 'index.html';
    }
  }

  function getDirection(current, target) {
    const fromIndex = NAV_ORDER.indexOf(current);
    const toIndex = NAV_ORDER.indexOf(target);
    if (fromIndex === -1 || toIndex === -1) {
      return 'forward';
    }
    if (toIndex === fromIndex) {
      return 'none';
    }
    return toIndex < fromIndex ? 'backward' : 'forward';
  }

  function storeDirection(direction) {
    try {
      sessionStorage.setItem(STORAGE_KEY, direction);
    } catch (err) {
      // Ignore storage issues (private mode, etc)
    }
  }

  function consumeDirection() {
    try {
      const direction = sessionStorage.getItem(STORAGE_KEY);
      if (direction) {
        sessionStorage.removeItem(STORAGE_KEY);
        return direction;
      }
    } catch (err) {
      // Ignore storage errors
    }
    return null;
  }

  function applyEnterTransition() {
    const body = document.body;
    if (!body) {
      return;
    }
    const direction = consumeDirection();
    const enterClass = direction === 'backward'
      ? 'page-transition-from-left'
      : 'page-transition-from-right';

    body.classList.remove('page-transitioning', 'page-exit-forward', 'page-exit-backward');
    body.classList.add('page-transition-ready', enterClass);
    requestAnimationFrame(() => {
      body.classList.remove(enterClass);
    });
  }

  function performNavigation(targetHref, direction) {
    const body = document.body;
    if (!body) {
      window.location.href = targetHref;
      return;
    }
    if (body.classList.contains('page-transitioning')) {
      window.location.href = targetHref;
      return;
    }

    const exitClass = direction === 'backward' ? 'page-exit-backward' : 'page-exit-forward';
    if (direction && direction !== 'none') {
      storeDirection(direction);
    } else {
      storeDirection('forward');
    }

    body.classList.add('page-transitioning', exitClass);

    window.setTimeout(() => {
      window.location.href = targetHref;
    }, EXIT_DELAY);
  }

  function handleNavClick(event) {
    const link = event.currentTarget;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || link.hasAttribute('download')) {
      return;
    }
    const target = normalizePath(href);
    const current = normalizePath(window.location.pathname);
    const direction = getDirection(current, target);
    if (direction === 'none') {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    performNavigation(href, direction);
  }

  function setupNavLinks() {
    const links = document.querySelectorAll('#main-nav a[href]');
    links.forEach(link => {
      link.addEventListener('click', handleNavClick);
    });
  }

  function isMobileView() {
    return window.matchMedia('(max-width: 720px)').matches;
  }

  function setupSwipeNavigation() {
    const body = document.body;
    if (!body) {
      return;
    }

    let tracking = false;
    let startX = 0;
    let startY = 0;

    body.addEventListener('touchstart', event => {
      if (!isMobileView()) {
        return;
      }
      if (event.touches.length !== 1) {
        return;
      }
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    }, { passive: true });

    body.addEventListener('touchmove', event => {
      if (!tracking) {
        return;
      }
      const touch = event.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dy > dx) {
        tracking = false;
      }
    }, { passive: true });

    body.addEventListener('touchend', event => {
      if (!tracking) {
        return;
      }
      tracking = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < 60 || Math.abs(dy) > 80) {
        return;
      }
      const current = normalizePath(window.location.pathname);
      const currentIndex = NAV_ORDER.indexOf(current);
      if (currentIndex === -1) {
        return;
      }
      let targetIndex = currentIndex;
      if (dx > 0) {
        targetIndex = Math.max(0, currentIndex - 1);
      } else if (dx < 0) {
        targetIndex = Math.min(NAV_ORDER.length - 1, currentIndex + 1);
      }
      if (targetIndex === currentIndex) {
        return;
      }
      const target = NAV_ORDER[targetIndex];
      const direction = targetIndex < currentIndex ? 'backward' : 'forward';
      performNavigation(target, direction);
    }, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyEnterTransition();
    setupNavLinks();
    setupSwipeNavigation();
  });

  window.addEventListener('pageshow', event => {
    if (event && event.persisted) {
      applyEnterTransition();
    }
  });
})();
