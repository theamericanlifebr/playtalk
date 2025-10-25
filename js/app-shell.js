(function () {
  const VIEW_ORDER = ['home', 'settings', 'stats', 'social', 'ranking', 'profile'];
  const body = document.body;
  const viewStack = document.getElementById('view-stack');
  if (!body || !viewStack) {
    return;
  }

  const views = new Map();
  viewStack.querySelectorAll('.view').forEach(view => {
    const key = view.dataset.view;
    if (!key) {
      return;
    }
    views.set(key, view);
  });

  let currentView = body.dataset.activeView && views.has(body.dataset.activeView)
    ? body.dataset.activeView
    : 'home';
  let animating = false;
  let activePointer = null;
  let swipeStartX = 0;
  let swipeStartY = 0;

  function setBodyView(nextView) {
    body.dataset.activeView = nextView;
    VIEW_ORDER.forEach(viewName => {
      const className = `page-${viewName}`;
      if (viewName === nextView) {
        body.classList.add(className);
      } else {
        body.classList.remove(className);
      }
    });
  }

  function updateNavState(nextView) {
    const navButtons = document.querySelectorAll('#main-nav .nav-item[data-nav-target]');
    navButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.navTarget === nextView);
    });

  }

  function applyHash(nextView) {
    const hash = `#${encodeURIComponent(nextView)}`;
    if (window.location.hash !== hash) {
      history.replaceState(null, '', hash);
    }
  }

  function finalizeTransition(outgoing, incoming, exitClass, enterClass, nextView) {
    if (outgoing) {
      outgoing.classList.remove('view--active', exitClass);
      outgoing.style.removeProperty('animation');
    }
    if (incoming) {
      incoming.classList.remove(enterClass);
    }
    currentView = nextView;
    animating = false;
    setBodyView(nextView);
    updateNavState(nextView);
    applyHash(nextView);
    document.dispatchEvent(new CustomEvent('playtalk:view-change', {
      detail: { view: nextView }
    }));
  }

  function showView(nextView, { skipAnimation = false } = {}) {
    if (!views.has(nextView) || nextView === currentView || animating) {
      return;
    }

    const incoming = views.get(nextView);
    const outgoing = views.get(currentView);

    if (skipAnimation) {
      if (outgoing) {
        outgoing.classList.remove('view--active', 'view--enter-left', 'view--enter-right', 'view--exit-left', 'view--exit-right');
      }
      incoming.classList.add('view--active');
      finalizeTransition(outgoing, incoming, '', '', nextView);
      return;
    }

    const currentIndex = VIEW_ORDER.indexOf(currentView);
    const nextIndex = VIEW_ORDER.indexOf(nextView);
    const direction = nextIndex > currentIndex ? 'forward' : 'backward';
    const enterClass = direction === 'forward' ? 'view--enter-right' : 'view--enter-left';
    const exitClass = direction === 'forward' ? 'view--exit-left' : 'view--exit-right';

    animating = true;

    if (outgoing) {
      outgoing.classList.remove('view--enter-left', 'view--enter-right', 'view--exit-left', 'view--exit-right');
      outgoing.classList.add(exitClass);
      outgoing.addEventListener('animationend', () => {
        finalizeTransition(outgoing, incoming, exitClass, enterClass, nextView);
      }, { once: true });
    } else {
      finalizeTransition(outgoing, incoming, exitClass, enterClass, nextView);
    }

    incoming.classList.remove('view--enter-left', 'view--enter-right', 'view--exit-left', 'view--exit-right');
    incoming.classList.add('view--active', enterClass);
    incoming.addEventListener('animationend', () => {
      incoming.classList.remove(enterClass);
    }, { once: true });

  }

  function handleNav(event) {
    const target = event.currentTarget;
    const view = target.dataset.navTarget;
    if (!view) {
      return;
    }
    if (target.tagName === 'A') {
      event.preventDefault();
    }
    showView(view);
  }

  function handleHashChange() {
    const hashView = decodeURIComponent(window.location.hash.replace('#', '') || '');
    if (hashView && views.has(hashView)) {
      showView(hashView);
    }
  }

  function handlePointerDown(event) {
    if (animating) {
      return;
    }
    activePointer = event.pointerId;
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
  }

  function handlePointerUp(event) {
    if (animating || activePointer !== event.pointerId) {
      return;
    }
    const dx = event.clientX - swipeStartX;
    const dy = event.clientY - swipeStartY;
    activePointer = null;

    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) {
      return;
    }

    const currentIndex = VIEW_ORDER.indexOf(currentView);
    if (dx < 0 && currentIndex < VIEW_ORDER.length - 1) {
      showView(VIEW_ORDER[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      showView(VIEW_ORDER[currentIndex - 1]);
    }
  }

  const navTargets = document.querySelectorAll('[data-nav-target]');
  navTargets.forEach(element => {
    element.addEventListener('click', handleNav);
  });

  if (viewStack) {
    viewStack.addEventListener('pointerdown', handlePointerDown);
    viewStack.addEventListener('pointerup', handlePointerUp);
  }

  window.addEventListener('hashchange', handleHashChange);

  if (!views.has(currentView)) {
    currentView = 'home';
  }

  setBodyView(currentView);
  updateNavState(currentView);
  applyHash(currentView);

  const initialHash = decodeURIComponent(window.location.hash.replace('#', '') || '');
  const initialView = initialHash && views.has(initialHash) ? initialHash : currentView;

  if (initialView !== currentView) {
    showView(initialView, { skipAnimation: true });
  } else {
    document.dispatchEvent(new CustomEvent('playtalk:view-change', {
      detail: { view: currentView }
    }));
  }
})();
