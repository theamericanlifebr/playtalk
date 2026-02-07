(function() {
  function setupPageTransitions() {
    const body = document.body;
    if (!body) {
      return;
    }

    body.classList.remove('page-transition-leave');

    const navLinks = Array.from(document.querySelectorAll('#main-nav a.nav-item[data-nav-index]'))
      .sort((a, b) => {
        const aIndex = Number(a.dataset.navIndex || 0);
        const bIndex = Number(b.dataset.navIndex || 0);
        return aIndex - bIndex;
      });
    if (!navLinks.length) {
      requestAnimationFrame(() => {
        body.classList.add('page-transition-ready');
      });
      return;
    }

    const PAGE_MANIFEST = {
      'index.html': { hash: '#home', scripts: ['js/main.js', 'js/vocabulary-game.js'], classes: ['page-home'] },
      'fun.html': { hash: '#fun', scripts: ['js/fun-page.js'], classes: ['page-fun'] },
      'play.html': { hash: '#play', scripts: ['js/play.js'], classes: ['page-play'] }
    };

    const transitionClasses = new Set(['page-transition-ready', 'page-transition-leave']);
    const loadedScripts = new Set();
    const pageCache = new Map();
    const parser = new DOMParser();
    const insertionAnchor = document.querySelector('footer.page-footer');

    const hashToPath = Object.entries(PAGE_MANIFEST).reduce((acc, [pathKey, manifest]) => {
      if (manifest && manifest.hash) {
        acc[manifest.hash] = pathKey;
      }
      return acc;
    }, {});

    const resolvePathKey = (href, { ignoreHash = false } = {}) => {
      const url = new URL(href, window.location.href);
      if (!ignoreHash && url.hash && hashToPath[url.hash]) {
        return hashToPath[url.hash];
      }
      const path = url.pathname.replace(/\/+$/, '');
      const segments = path.split('/').filter(Boolean);
      const last = segments.length ? segments[segments.length - 1] : 'index.html';
      return last || 'index.html';
    };

    const initialKey = resolvePathKey(window.location.href, { ignoreHash: true });
    const initialMain = document.querySelector('main[data-page-transition]');
    if (initialMain) {
      pageCache.set(initialKey, {
        main: initialMain,
        bodyClasses: Array.from(body.classList)
      });
    }
    const initialManifest = PAGE_MANIFEST[initialKey];
    if (initialManifest && Array.isArray(initialManifest.scripts)) {
      initialManifest.scripts.forEach(script => loadedScripts.add(script));
    }

    let currentKey = initialKey;

    const baseUrl = new URL(window.location.href);
    baseUrl.pathname = baseUrl.pathname.replace(/[^/]+$/, 'index.html');

    const setActiveNav = (pathKey) => {
      navLinks.forEach(link => {
        const linkKey = resolvePathKey(link.getAttribute('href') || '');
        const isActive = linkKey === pathKey;
        link.classList.toggle('active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    const updateBodyClasses = (nextClasses = []) => {
      const preserved = Array.from(body.classList).filter(cls => !cls.startsWith('page-') || transitionClasses.has(cls));
      body.className = '';
      preserved.forEach(cls => body.classList.add(cls));
      nextClasses.forEach(cls => {
        if (!transitionClasses.has(cls)) {
          body.classList.add(cls);
        }
      });
    };

    const ensureScripts = async (pathKey) => {
      const manifest = PAGE_MANIFEST[pathKey];
      if (!manifest || !Array.isArray(manifest.scripts)) {
        return;
      }
      for (const scriptPath of manifest.scripts) {
        if (loadedScripts.has(scriptPath)) {
          continue;
        }
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = scriptPath;
          script.async = false;
          script.onload = () => {
            loadedScripts.add(scriptPath);
            resolve();
          };
          script.onerror = () => reject(new Error(`Não foi possível carregar ${scriptPath}`));
          document.body.appendChild(script);
        });
      }
    };

    const fetchPage = async (pathKey) => {
      if (pageCache.has(pathKey)) {
        return pageCache.get(pathKey);
      }
      const response = await fetch(pathKey, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar ${pathKey} (${response.status})`);
      }
      const text = await response.text();
      const doc = parser.parseFromString(text, 'text/html');
      const main = doc.querySelector('main[data-page-transition]');
      if (!main) {
        throw new Error('Conteúdo principal não encontrado.');
      }
      const importedMain = document.importNode(main, true);
      importedMain.setAttribute('hidden', 'hidden');
      if (insertionAnchor && insertionAnchor.parentNode) {
        insertionAnchor.parentNode.insertBefore(importedMain, insertionAnchor);
      } else {
        body.appendChild(importedMain);
      }
      const entry = {
        main: importedMain,
        bodyClasses: Array.from(doc.body.classList),
        lensContext: doc.body.getAttribute('data-lens-context') || ''
      };
      pageCache.set(pathKey, entry);
      return entry;
    };

    const showPage = async (pathKey, { pushState = false } = {}) => {
      const manifest = PAGE_MANIFEST[pathKey] || null;
      try {
        const entry = await fetchPage(pathKey);
        await ensureScripts(pathKey);
        const classes = manifest && manifest.classes ? manifest.classes : entry.bodyClasses || [];
        const currentEntry = pageCache.get(currentKey);
        if (currentEntry && currentEntry.main) {
          currentEntry.main.setAttribute('hidden', 'hidden');
        }
        entry.main.removeAttribute('hidden');
        updateBodyClasses(classes);
        if (entry && entry.lensContext) {
          body.dataset.lensContext = entry.lensContext;
        } else {
          delete body.dataset.lensContext;
        }
        if (window.playtalkSettings && typeof window.playtalkSettings.applyVisualPreferences === 'function') {
          window.playtalkSettings.applyVisualPreferences(window.playtalkSettings.loadSettings());
        }
        if (typeof window.runPlaytalkPage === 'function' && classes.length) {
          window.runPlaytalkPage(classes, { container: entry.main });
        }
        if (pathKey === 'index.html' && typeof window.goHome === 'function') {
          window.goHome();
        }
        currentKey = pathKey;
        setActiveNav(pathKey);
        if (pushState) {
          const nextUrl = new URL(baseUrl.href);
          nextUrl.hash = manifest && manifest.hash ? manifest.hash : `#${pathKey.replace(/\.html$/, '')}`;
          history.pushState({ path: pathKey }, '', nextUrl.href);
        }
      } catch (error) {
        console.error('Não foi possível trocar de página:', error);
      } finally {
        body.classList.remove('page-transition-leave');
        body.classList.add('page-transition-ready');
      }
    };

    const navigateTo = (targetPath, options = {}) => {
      const pathKey = resolvePathKey(targetPath || '');
      if (!pathKey || pathKey === currentKey) {
        return;
      }
      body.classList.add('page-transition-leave');
      showPage(pathKey, { pushState: options.pushState !== false });
    };

    navLinks.forEach(link => {
      link.addEventListener('click', event => {
        if (event.defaultPrevented) {
          return;
        }
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        if (link.target && link.target.toLowerCase() !== '_self') {
          return;
        }
        event.preventDefault();
        navigateTo(link.getAttribute('href'), { pushState: true });
      });
    });

    window.addEventListener('popstate', event => {
      const state = event.state && event.state.path ? event.state.path : initialKey;
      navigateTo(state, { pushState: false });
    });

    const initialUrl = new URL(baseUrl.href);
    initialUrl.hash = initialManifest && initialManifest.hash ? initialManifest.hash : window.location.hash;
    history.replaceState({ path: currentKey }, '', initialUrl.href);
    setActiveNav(currentKey);

    const initialHashTarget = hashToPath[window.location.hash];
    if (initialHashTarget && initialHashTarget !== currentKey) {
      showPage(initialHashTarget, { pushState: false });
    }

    requestAnimationFrame(() => {
      body.classList.add('page-transition-ready');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupPageTransitions();
  });
})();
