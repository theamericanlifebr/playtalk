(function () {
  const views = {
    home: document.getElementById('home-view'),
    game: document.getElementById('game-view'),
    embed: document.getElementById('embedded-view')
  };
  const frame = document.getElementById('embedded-frame');
  const nav = document.getElementById('main-nav');
  const navItems = nav ? Array.from(nav.querySelectorAll('[data-view]')) : [];
  let currentEmbedSrc = '';

  function setActiveNav(target) {
    navItems.forEach(item => {
      if (item.classList.contains('nav-item')) {
        item.classList.toggle('active', item === target);
      }
    });
  }

  function toggleView(key) {
    Object.entries(views).forEach(([viewKey, el]) => {
      if (!el) return;
      const isActive = viewKey === key;
      el.classList.toggle('app-view--active', isActive);
      el.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
  }

  function showHome() {
    toggleView('home');
    setActiveNav(navItems.find(item => item.dataset.view === 'home') || null);
    if (frame) {
      frame.blur();
    }
  }

  function showGame() {
    toggleView('game');
    setActiveNav(navItems.find(item => item.dataset.view === 'home') || null);
  }

  function showEmbedded(src, origin) {
    toggleView('embed');
    if (src && frame && currentEmbedSrc !== src) {
      currentEmbedSrc = src;
      frame.src = src;
    }
    setActiveNav(origin || null);
    if (typeof window.closeUserMenu === 'function') {
      window.closeUserMenu();
    }
  }

  if (nav) {
    nav.addEventListener('click', (event) => {
      const target = event.target.closest('[data-view]');
      if (!target) {
        return;
      }
      event.preventDefault();
      const view = target.dataset.view;
      if (view === 'home') {
        showHome();
      } else if (view === 'game') {
        showGame();
      } else {
        const src = target.dataset.src || '';
        let origin = target.classList.contains('nav-item') ? target : target.closest('.nav-item');
        if (!origin) {
          const userItem = target.closest('.nav-item--user');
          if (userItem) {
            origin = userItem.querySelector('.nav-item');
          }
        }
        showEmbedded(src, origin);
      }
    });
  }

  window.playtalkNavigation = {
    showHome,
    showGame,
    showEmbedded
  };

  showHome();
})();
