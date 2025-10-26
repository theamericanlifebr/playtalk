(function () {
  const API_BASE_URL = window.playtalkAuthApiBase || '';
  const CURRENT_USER_KEY = 'currentUser';
  const DEFAULT_AVATAR_URL =
    'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';
  const PROGRESS_SCHEMA = {
    acertosTotais: { type: 'number', default: 0 },
    errosTotais: { type: 'number', default: 0 },
    tentativasTotais: { type: 'number', default: 0 },
    points: { type: 'number', default: 0 },
    displayName: { type: 'string', default: '' },
    modeStats: { type: 'json', default: {} },
    completedModes: { type: 'json', default: {} },
    unlockedModes: { type: 'json', default: {} },
    modeIntroShown: { type: 'json', default: {} },
    pastaAtual: { type: 'number', default: 1 },
    levelProgress: { type: 'json', default: { level: 1, correct: 0 } },
    tutorialDone: { type: 'boolean', default: false },
    ilifeDone: { type: 'boolean', default: false },
    levelDetails: { type: 'json', default: [] },
    totalTime: { type: 'number', default: 0 },
    shareResults: { type: 'boolean', default: false },
    avatar: { type: 'string', default: DEFAULT_AVATAR_URL }
  };

  let cachedCurrentUser = null;
  let openLoginFlowHandler = null;
  let closeLoginFlowHandler = null;
  let closeUserMenu = null;
  let teardownUserMenu = null;

  function apiUrl(path) {
    if (!API_BASE_URL) {
      return path;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const base = API_BASE_URL.trim();
    if (!base) {
      return path;
    }

    const hasProtocol = /^https?:\/\//.test(base);
    const normalizedBase = hasProtocol
      ? base
      : `${window.location.origin.replace(/\/$/, '')}/${base.replace(/^\//, '')}`;

    let baseUrl;
    try {
      baseUrl = new URL(normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`);
    } catch (error) {
      console.warn('API base URL inválida, utilizando caminho original:', error);
      return path;
    }

    if (path.startsWith('/')) {
      return `${baseUrl.origin}${path}`;
    }

    return new URL(path, baseUrl).toString();
  }

  async function apiRequest(path, { method = 'GET', body, headers, signal } = {}) {
    const url = apiUrl(path);
    const options = { method, signal, headers: { ...(headers || {}) } };

    if (body !== undefined && body !== null) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }

    if (!response.ok || (data && data.success === false)) {
      const message = (data && data.message) || `Erro na requisição (${response.status})`;
      const error = new Error(message);
      error.response = response;
      error.data = data;
      throw error;
    }

    return data;
  }

  function apiSendBeacon(path, body) {
    if (!navigator.sendBeacon) {
      return false;
    }
    try {
      const url = apiUrl(path);
      const payload = JSON.stringify(body);
      const blob = new Blob([payload], { type: 'application/json' });
      return navigator.sendBeacon(url, blob);
    } catch (err) {
      console.warn('Não foi possível enviar beacon:', err);
      return false;
    }
  }

  function getDefaultValue(schema) {
    if (!('default' in schema)) return undefined;
    if (schema.type === 'json') {
      return JSON.parse(JSON.stringify(schema.default));
    }
    return schema.default;
  }

  function createDefaultData() {
    const data = {};
    for (const [key, schema] of Object.entries(PROGRESS_SCHEMA)) {
      data[key] = getDefaultValue(schema);
    }
    return data;
  }

  function parseValue(raw, schema) {
    if (raw === null || raw === undefined) return undefined;
    switch (schema.type) {
      case 'number':
        return Number(raw) || 0;
      case 'boolean':
        return raw === 'true';
      case 'json':
        try {
          return JSON.parse(raw);
        } catch (err) {
          console.warn(`Não foi possível analisar ${schema.type} para ${raw}:`, err);
          return getDefaultValue(schema);
        }
      default:
        return raw;
    }
  }

  function serializeValue(value, schema) {
    switch (schema.type) {
      case 'number':
        return String(Number(value) || 0);
      case 'boolean':
        return value ? 'true' : 'false';
      case 'json':
        return JSON.stringify(value ?? schema.default);
      default:
        return value == null ? '' : String(value);
    }
  }

  function applyUserDataToStorage(user) {
    const data = (user && user.data) || {};
    for (const [key, schema] of Object.entries(PROGRESS_SCHEMA)) {
      let value = data[key];
      if (value === undefined) {
        value = getDefaultValue(schema);
      }
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, serializeValue(value, schema));
      }
    }
  }

  function collectProgressFromStorage() {
    const snapshot = {};
    for (const [key, schema] of Object.entries(PROGRESS_SCHEMA)) {
      const raw = localStorage.getItem(key);
      const value = parseValue(raw, schema);
      if (value !== undefined) {
        snapshot[key] = value;
      }
    }
    return snapshot;
  }

  function readStoredCurrentUser() {
    if (cachedCurrentUser) return cachedCurrentUser;
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      cachedCurrentUser = stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error('Erro ao carregar usuário atual:', err);
      cachedCurrentUser = null;
    }
    window.currentUser = cachedCurrentUser;
    return cachedCurrentUser;
  }

  function setCurrentUser(user) {
    cachedCurrentUser = user ? { ...user } : null;
    if (cachedCurrentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(cachedCurrentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    window.currentUser = cachedCurrentUser;
  }

  async function loginRequest(username, password) {
    const response = await apiRequest('/api/users/login', {
      method: 'POST',
      body: { username, password }
    });
    if (!response || !response.success || !response.user) {
      throw new Error((response && response.message) || 'Não foi possível entrar.');
    }
    return response.user;
  }

  async function registerRequest(username, password) {
    const response = await apiRequest('/api/users/register', {
      method: 'POST',
      body: { username, password }
    });
    if (!response || !response.success || !response.user) {
      throw new Error((response && response.message) || 'Não foi possível registrar.');
    }
    return response.user;
  }

  async function updateUserRequest(payload) {
    const response = await apiRequest('/api/users/update', {
      method: 'POST',
      body: payload
    });
    if (!response || !response.success) {
      throw new Error((response && response.message) || 'Não foi possível atualizar o usuário.');
    }
    return response.user;
  }

  function dispatchUserChange() {
    const user = readStoredCurrentUser();
    document.dispatchEvent(new CustomEvent('playtalk:user-change', {
      detail: { user }
    }));
  }

  function getLevelRequirement(level) {
    const normalized = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
    return 9 + normalized;
  }

  function readLevelProgress() {
    const raw = localStorage.getItem('levelProgress');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const level = Number.isFinite(parsed.level) && parsed.level > 0 ? Math.floor(parsed.level) : 1;
        const correct = Number.isFinite(parsed.correct) && parsed.correct >= 0 ? Math.floor(parsed.correct) : 0;
        return { level, correct };
      } catch (err) {
        console.warn('Não foi possível ler o progresso de nível.', err);
      }
    }
    const fallbackLevel = parseInt(localStorage.getItem('pastaAtual'), 10);
    return {
      level: Number.isFinite(fallbackLevel) && fallbackLevel > 0 ? fallbackLevel : 1,
      correct: 0
    };
  }

  function getStoredLevel() {
    const progress = readLevelProgress();
    return progress.level;
  }

  function getDisplayName(user) {
    const stored = localStorage.getItem('displayName');
    if (stored && stored.trim()) {
      return stored.trim();
    }
    if (user && user.data && user.data.displayName) {
      return user.data.displayName;
    }
    return (user && user.username) || '';
  }

  function updateAuthStatus() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const nameEl = document.getElementById('header-username');
    const levelEl = document.getElementById('header-level');
    const avatarEl = document.getElementById('header-avatar');
    const avatarContainer = document.getElementById('header-avatar-container');
    const user = readStoredCurrentUser();
    const displayName = user
      ? (getDisplayName(user) || user.username || 'Jogador')
      : 'Visitante';
    const levelProgress = readLevelProgress();
    const level = levelProgress.level;
    const requirement = getLevelRequirement(level);
    const normalizedCorrect = Math.max(0, Math.min(levelProgress.correct, requirement));
    const ratio = requirement > 0 ? Math.max(0, Math.min(1, normalizedCorrect / requirement)) : 0;
    let avatarUrl = DEFAULT_AVATAR_URL;
    const storedAvatar = localStorage.getItem('avatar');
    if (storedAvatar && storedAvatar.trim()) {
      avatarUrl = storedAvatar.trim();
    } else if (user && user.data && typeof user.data.avatar === 'string' && user.data.avatar.trim()) {
      avatarUrl = user.data.avatar.trim();
    }

    if (nameEl) {
      nameEl.textContent = displayName;
      nameEl.title = displayName;
    }
    if (levelEl) {
      levelEl.textContent = `Nível ${level}`;
    }

    if (avatarContainer) {
      avatarContainer.style.setProperty('--avatar-progress', `${(ratio * 360).toFixed(2)}deg`);
      avatarContainer.title = `Progresso de nível: ${normalizedCorrect}/${requirement}`;
    }

    if (avatarEl) {
      if (avatarEl.getAttribute('src') !== avatarUrl) {
        avatarEl.src = avatarUrl;
      }
      avatarEl.alt = `Foto de ${displayName}`;
    }

    if (loginBtn) {
      loginBtn.style.display = user ? 'none' : 'inline-flex';
    }
    if (logoutBtn) {
      logoutBtn.style.display = user ? 'flex' : 'none';
    }
    if (!user && typeof closeUserMenu === 'function') {
      closeUserMenu();
    }
    if (user && typeof closeLoginFlowHandler === 'function') {
      closeLoginFlowHandler();
    }
  }

  function clearProgressStorage() {
    for (const key of Object.keys(PROGRESS_SCHEMA)) {
      localStorage.removeItem(key);
    }
  }

  async function updateUserSnapshot({ useBeacon = false } = {}) {
    const user = readStoredCurrentUser();
    if (!user || !user.key) return;

    const snapshot = collectProgressFromStorage();
    const payload = {
      key: user.key,
      data: snapshot,
      username: user.username,
      password: user.password
    };

    if (useBeacon && apiSendBeacon('/api/users/update', payload)) {
      setCurrentUser({ ...user, data: { ...user.data, ...snapshot } });
      return;
    }

    try {
      const updatedUser = await updateUserRequest(payload);
      if (updatedUser) {
        setCurrentUser({ ...user, ...updatedUser });
      }
    } catch (err) {
      console.error('Erro ao sincronizar progresso do usuário:', err);
    }
  }

  async function handleLogout() {
    await updateUserSnapshot();
    setCurrentUser(null);
    clearProgressStorage();
    updateAuthStatus();
    dispatchUserChange();
    if (typeof openLoginFlowHandler === 'function') {
      openLoginFlowHandler();
    }
  }
  async function completeLoginFlow({ username, password, confirm }) {
    if (!username || !password || !confirm) {
      throw new Error('Preencha todos os campos.');
    }
    if (password !== confirm) {
      const error = new Error('As senhas não coincidem.');
      error.step = 'password';
      throw error;
    }

    try {
      const user = await registerRequest(username, password);
      setCurrentUser(user);
      applyUserDataToStorage(user);
      updateAuthStatus();
      dispatchUserChange();
    } catch (err) {
      if (err && err.message && /existe|cadastr/i.test(err.message)) {
        try {
          const user = await loginRequest(username, password);
          setCurrentUser(user);
          applyUserDataToStorage(user);
          updateAuthStatus();
          dispatchUserChange();
          return;
        } catch (loginErr) {
          loginErr.step = 'password';
          throw loginErr;
        }
      }
      if (err) {
        err.step = err.step || 'confirm';
      }
      throw err;
    }
  }

  function setupUserMenu() {
    if (typeof teardownUserMenu === 'function') {
      teardownUserMenu();
      teardownUserMenu = null;
    }

    const container = document.querySelector('.nav-item--user');
    if (!container) {
      return;
    }

    const trigger = container.querySelector('.nav-item__trigger');
    const menu = container.querySelector('.nav-item__menu');
    if (!trigger || !menu) {
      return;
    }

    const closeMenu = () => {
      if (!container.classList.contains('nav-item--open')) {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        return;
      }
      container.classList.remove('nav-item--open');
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      container.classList.add('nav-item--open');
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    };

    const toggleMenu = event => {
      event.preventDefault();
      event.stopPropagation();
      if (container.classList.contains('nav-item--open')) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    const handleDocumentClick = event => {
      if (!container.contains(event.target)) {
        closeMenu();
      }
    };

    const handleKeydown = event => {
      if (event.key === 'Escape') {
        closeMenu();
        trigger.focus();
      }
    };

    const handleTriggerKeydown = event => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    const handleMenuClick = event => {
      event.stopPropagation();
    };

    trigger.addEventListener('click', toggleMenu);
    trigger.addEventListener('keydown', handleTriggerKeydown);
    menu.addEventListener('click', handleMenuClick);

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeydown);

    teardownUserMenu = () => {
      closeMenu();
      trigger.removeEventListener('click', toggleMenu);
      trigger.removeEventListener('keydown', handleTriggerKeydown);
      menu.removeEventListener('click', handleMenuClick);
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeydown);
      closeUserMenu = null;
      teardownUserMenu = null;
    };

    closeUserMenu = closeMenu;
    closeMenu();
  }

  function setupLoginFlow() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const flow = document.getElementById('login-flow');
    const form = document.getElementById('login-flow-form');
    const errorEl = document.getElementById('login-flow-error');
    const usernameInput = document.getElementById('login-flow-username');
    const passwordInput = document.getElementById('login-flow-password');
    const confirmInput = document.getElementById('login-flow-confirm');

    if (logoutBtn) {
      logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        handleLogout();
      });
    }

    if (!flow || !form || !usernameInput || !passwordInput || !confirmInput) {
      openLoginFlowHandler = null;
      closeLoginFlowHandler = null;
      return;
    }

    if (flow.classList.contains('hidden')) {
      flow.setAttribute('aria-hidden', 'true');
    }

    const steps = Array.from(form.querySelectorAll('.login-flow__step'));
    let activeStep = 'username';

    function setError(message) {
      if (errorEl) {
        errorEl.textContent = message || '';
      }
    }

    function showStep(stepName) {
      activeStep = stepName;
      steps.forEach(step => {
        step.classList.toggle('login-flow__step--active', step.dataset.step === stepName);
      });
      if (stepName === 'username') {
        usernameInput.focus();
      } else if (stepName === 'password') {
        passwordInput.focus();
      } else {
        confirmInput.focus();
      }
    }

    function resetFlow() {
      form.reset();
      setError('');
      showStep('username');
    }

    function openFlow() {
      resetFlow();
      flow.classList.remove('hidden');
      flow.setAttribute('aria-hidden', 'false');
      document.body.classList.add('login-flow-open');
    }

    function closeFlow() {
      flow.classList.add('hidden');
      flow.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('login-flow-open');
      setError('');
    }

    openLoginFlowHandler = openFlow;
    closeLoginFlowHandler = closeFlow;

    if (loginBtn) {
      loginBtn.addEventListener('click', () => openFlow());
    }

    form.querySelectorAll('.login-flow__submit[data-action="next"]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const step = button.closest('.login-flow__step');
        if (!step) return;
        const stepName = step.dataset.step;
        if (stepName === 'username') {
          const value = usernameInput.value.trim();
          if (!value) {
            setError('Informe um nome de usuário.');
            usernameInput.focus();
            return;
          }
          setError('');
          showStep('password');
        } else if (stepName === 'password') {
          const value = passwordInput.value;
          if (!value || value.length < 4) {
            setError('Informe uma senha com pelo menos 4 caracteres.');
            passwordInput.focus();
            return;
          }
          setError('');
          showStep('confirm');
        }
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      const confirm = confirmInput.value;

      try {
        await completeLoginFlow({ username, password, confirm });
        setError('');
        closeFlow();
      } catch (err) {
        console.error('Erro ao concluir fluxo de acesso:', err);
        const message = err && err.message ? err.message : 'Não foi possível concluir o acesso.';
        setError(message);
        const stepName = err && err.step ? err.step : activeStep;
        if (stepName === 'password') {
          showStep('password');
          passwordInput.select();
        } else if (stepName === 'username') {
          showStep('username');
          usernameInput.select();
        }
      }
    });

    flow.addEventListener('click', (event) => {
      if (event.target === flow && cachedCurrentUser) {
        closeFlow();
      }
    });
  }

  async function init() {
    readStoredCurrentUser();
    const user = cachedCurrentUser;

    if (user) {
      applyUserDataToStorage(user);
    }

    updateAuthStatus();
    setupUserMenu();
    setupLoginFlow();

    window.addEventListener('beforeunload', () => {
      updateUserSnapshot({ useBeacon: true });
    });

    if (!user && typeof openLoginFlowHandler === 'function') {
      openLoginFlowHandler();
    }

    if (user && user.username && user.password) {
      try {
        const refreshedUser = await loginRequest(user.username, user.password);
        setCurrentUser(refreshedUser);
        applyUserDataToStorage(refreshedUser);
        updateAuthStatus();
      } catch (err) {
        console.warn('Não foi possível sincronizar usuário atual:', err);
        applyUserDataToStorage(user);
        updateAuthStatus();
      }
    }
  }

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

    let navigating = false;

    const navigateTo = (href) => {
      if (!href || navigating) {
        return;
      }
      const targetUrl = new URL(href, window.location.href);
      if (targetUrl.href === window.location.href) {
        return;
      }
      navigating = true;
      body.classList.add('page-transition-leave');
      setTimeout(() => {
        window.location.href = targetUrl.href;
      }, 350);
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
        navigateTo(link.getAttribute('href'));
      });
    });

    const getCurrentNavIndex = () => {
      const currentPath = window.location.pathname.replace(/\/+$/, '');
      const matchedIndex = navLinks.findIndex(link => {
        const linkPath = new URL(link.getAttribute('href') || '', window.location.href).pathname.replace(/\/+$/, '');
        return linkPath === currentPath;
      });
      if (matchedIndex !== -1) {
        return matchedIndex;
      }
      const activeLink = navLinks.find(link => link.classList.contains('active'));
      return activeLink ? navLinks.indexOf(activeLink) : -1;
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchActive = false;

    document.addEventListener('touchstart', event => {
      if (window.innerWidth > 720 || event.touches.length !== 1) {
        return;
      }
      touchActive = true;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', event => {
      if (!touchActive || window.innerWidth > 720) {
        touchActive = false;
        return;
      }
      touchActive = false;
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) {
        return;
      }
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const horizontalThreshold = 60;
      const verticalAllowance = 80;
      if (Math.abs(deltaX) < horizontalThreshold || Math.abs(deltaY) > verticalAllowance) {
        return;
      }
      const currentIndex = getCurrentNavIndex();
      if (currentIndex === -1) {
        return;
      }
      let targetIndex = currentIndex;
      if (deltaX < 0 && currentIndex < navLinks.length - 1) {
        targetIndex = currentIndex + 1;
      } else if (deltaX > 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
      if (targetIndex !== currentIndex) {
        navigateTo(navLinks[targetIndex].getAttribute('href'));
      }
    }, { passive: true });

    requestAnimationFrame(() => {
      body.classList.add('page-transition-ready');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupPageTransitions();
  });

  document.addEventListener('playtalk:user-change', () => {
    updateAuthStatus();
  });

  document.addEventListener('playtalk:level-progress', event => {
    const detail = event && event.detail ? event.detail : null;
    if (detail) {
      const levelValue = Number.isFinite(detail.level) && detail.level > 0 ? Math.floor(detail.level) : getStoredLevel();
      const requirement = Number.isFinite(detail.required) && detail.required > 0
        ? Math.floor(detail.required)
        : getLevelRequirement(levelValue);
      const correct = Number.isFinite(detail.correct) && detail.correct >= 0
        ? Math.floor(detail.correct)
        : Math.max(0, Math.min(readLevelProgress().correct, requirement));
      const ratio = requirement > 0 ? Math.max(0, Math.min(1, (detail.ratio ?? (correct / requirement)))) : 0;
      const levelEl = document.getElementById('header-level');
      if (levelEl) {
        levelEl.textContent = `Nível ${levelValue}`;
      }
      const avatarContainer = document.getElementById('header-avatar-container');
      if (avatarContainer) {
        avatarContainer.style.setProperty('--avatar-progress', `${(ratio * 360).toFixed(2)}deg`);
        avatarContainer.title = `Progresso de nível: ${Math.min(correct, requirement)}/${requirement}`;
      }
    } else {
      updateAuthStatus();
    }
  });

  window.addEventListener('storage', (event) => {
    if (!event) {
      return;
    }

    const watchedKeys = ['pastaAtual', 'displayName', 'avatar', 'levelProgress'];
    if (event.key && watchedKeys.includes(event.key)) {
      updateAuthStatus();
      return;
    }

    if (event.key && event.key.startsWith('profile:')) {
      updateAuthStatus();
      return;
    }

    if (event.key === null) {
      updateAuthStatus();
    }
  });

  window.playtalkAuth = {
    getCurrentUser: () => readStoredCurrentUser(),
    persistProgress: () => updateUserSnapshot(),
    applyUserData: applyUserDataToStorage,
    createDefaultData,
    openLoginFlow: () => {
      if (typeof openLoginFlowHandler === 'function') {
        openLoginFlowHandler();
      }
    }
  };
})();
