(function () {
  const viewOrder = ['home', 'settings', 'stats', 'social', 'ranking', 'profile'];
  const body = document.body;
  const appMain = document.getElementById('app-main');
  if (!appMain) {
    return;
  }

  const views = viewOrder
    .map(name => document.querySelector(`.app-view[data-view="${name}"]`))
    .filter(Boolean);

  const viewClassMap = {
    home: 'page-home',
    settings: 'page-fun',
    stats: 'page-play',
    social: 'page-social',
    ranking: 'page-ranking',
    profile: 'page-profile'
  };

  let activeIndex = 0;
  const navButtons = Array.from(document.querySelectorAll('#main-nav .nav-item'));
  const headerHeight = () => document.getElementById('global-header')?.offsetHeight || 0;

  function updateAria() {
    views.forEach((view, index) => {
      const isActive = index === activeIndex;
      view.classList.toggle('app-view--active', isActive);
      view.toggleAttribute('aria-hidden', !isActive);
    });
  }

  function updateBodyClass(nextView) {
    Object.values(viewClassMap).forEach(cls => body.classList.remove(cls));
    const nextClass = viewClassMap[nextView];
    if (nextClass) {
      body.classList.add(nextClass);
    }
    body.dataset.activeView = nextView;
  }

  function updateNavButtons(nextView) {
    navButtons.forEach(button => {
      const isActive = button.dataset.view === nextView;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  function dispatchViewChange(previousView, nextView) {
    const event = new CustomEvent('playtalk:view-change', {
      detail: {
        view: nextView,
        previousView
      }
    });
    document.dispatchEvent(event);
  }

  function setAppHeight() {
    const nav = document.getElementById('main-nav');
    const navHeight = nav ? nav.offsetHeight : 0;
    const available = window.innerHeight - headerHeight() - navHeight;
    appMain.style.setProperty('--app-main-height', `${Math.max(0, available)}px`);
  }

  function applyTransform(index, { animate = true } = {}) {
    if (!animate) {
      appMain.classList.add('app-main--no-transition');
    } else {
      appMain.classList.remove('app-main--no-transition');
    }
    appMain.style.transform = `translateX(-${index * 100}%)`;
  }

  function goToIndex(index, options = {}) {
    if (index === activeIndex || index < 0 || index >= viewOrder.length) {
      return;
    }
    const previousView = viewOrder[activeIndex];
    const nextView = viewOrder[index];
    activeIndex = index;
    applyTransform(index, options);
    updateAria();
    updateBodyClass(nextView);
    updateNavButtons(nextView);
    dispatchViewChange(previousView, nextView);
    if (!options.fromHistory) {
      history.pushState({ view: nextView }, '', window.location.pathname);
    }
  }

  function goToView(viewName, options = {}) {
    const index = viewOrder.indexOf(viewName);
    if (index === -1) {
      return;
    }
    goToIndex(index, options);
  }

  function handleNavClick(event) {
    const button = event.currentTarget;
    const viewName = button.dataset.view;
    goToView(viewName);
  }

  navButtons.forEach(button => {
    button.addEventListener('click', handleNavClick);
  });

  function handlePopState(event) {
    const viewName = event.state && event.state.view;
    if (!viewName) {
      goToIndex(0, { animate: false, fromHistory: true });
      return;
    }
    const index = viewOrder.indexOf(viewName);
    if (index !== -1) {
      goToIndex(index, { animate: false, fromHistory: true });
    }
  }

  window.addEventListener('popstate', handlePopState);

  function handleResize() {
    setAppHeight();
  }

  window.addEventListener('resize', handleResize);

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  const SWIPE_THRESHOLD = 60;
  const SWIPE_TIME = 600;

  function onTouchStart(event) {
    if (event.touches.length > 1) {
      return;
    }
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }

  function onTouchEnd(event) {
    if (!touchStartTime) {
      return;
    }
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    touchStartTime = 0;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) || dt > SWIPE_TIME) {
      return;
    }
    if (dx < 0) {
      goToIndex(Math.min(viewOrder.length - 1, activeIndex + 1));
    } else {
      goToIndex(Math.max(0, activeIndex - 1));
    }
  }

  appMain.addEventListener('touchstart', onTouchStart, { passive: true });
  appMain.addEventListener('touchend', onTouchEnd, { passive: true });

  updateAria();
  updateBodyClass(viewOrder[activeIndex]);
  updateNavButtons(viewOrder[activeIndex]);
  setAppHeight();
  applyTransform(activeIndex, { animate: false });
  history.replaceState({ view: viewOrder[activeIndex] }, '', window.location.pathname);

  window.playtalkShell = {
    navigate(viewName) {
      goToView(viewName);
    },
    getActiveView() {
      return viewOrder[activeIndex];
    },
    getViewOrder() {
      return viewOrder.slice();
    }
  };
})();
