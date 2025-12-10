(function () {
  const API_BASE_URL = window.playtalkAuthApiBase || '';
  const CURRENT_USER_KEY = 'currentUser';
  const BALANCE_KEY = 'playerBalance';
  const APP_CONTENT_CACHE_KEY = 'playtalkAppContent';
  const DEFAULT_AVATAR_URL =
    'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';
  const PROGRESS_SCHEMA = {
    acertosTotais: { type: 'number', default: 0 },
    errosTotais: { type: 'number', default: 0 },
    tentativasTotais: { type: 'number', default: 0 },
    points: { type: 'number', default: 0 },
    playerBalance: { type: 'number', default: 0 },
    displayName: { type: 'string', default: '' },
    modeStats: { type: 'json', default: {} },
    completedModes: { type: 'json', default: {} },
    unlockedModes: { type: 'json', default: {} },
    modeIntroShown: { type: 'json', default: {} },
    playtalkSettings: {
      type: 'json',
      default: {
        theme: 'light',
        retryWrongPhrases: false
      }
    },
    generalProgress: { type: 'json', default: { level: 1, xp: 0 } },
    modeProgress: { type: 'json', default: {} },
    pastaAtual: { type: 'number', default: 1 },
    tutorialDone: { type: 'boolean', default: false },
    ilifeDone: { type: 'boolean', default: false },
    levelDetails: { type: 'json', default: [] },
    totalTime: { type: 'number', default: 0 },
    shareResults: { type: 'boolean', default: true },
    avatar: { type: 'string', default: DEFAULT_AVATAR_URL },
    medalHistory: { type: 'json', default: [] },
    currentStreak: { type: 'number', default: 0 },
    bestStreak: { type: 'number', default: 0 },
    monthlyStats: { type: 'json', default: { month: '', totalAttempts: 0, eligibleAttempts: 0, correctAttempts: 0 } },
    recentPhraseStats: {
      type: 'json',
      default: { entries: [], totalChars: 0, totalTime: 0 }
    }
  };

  let cachedCurrentUser = null;
  let openLoginFlowHandler = null;
  let closeLoginFlowHandler = null;
  let closeUserMenu = null;
  let teardownUserMenu = null;

  function safeParseJSON(value, fallback) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Conteúdo JSON inválido, usando padrão.', error);
      return fallback;
    }
  }

  function readMedalHistoryFromStorage() {
    const raw = localStorage.getItem('medalHistory');
    const parsed = safeParseJSON(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function getAuraGradientFromHistory(history) {
    if (!Array.isArray(history) || history.length < 10) {
      return null;
    }
    if (!window.playtalkAura || typeof window.playtalkAura.gradientFor !== 'function') {
      return null;
    }
    try {
      return window.playtalkAura.gradientFor(history);
    } catch (error) {
      console.warn('Não foi possível calcular a aura score:', error);
      return null;
    }
  }

  function updateHeaderAura() {
    const avatarContainer = document.getElementById('header-avatar-container');
    if (!avatarContainer) {
      return;
    }
    const history = readMedalHistoryFromStorage();
    const gradient = getAuraGradientFromHistory(history);
    if (gradient) {
      avatarContainer.classList.add('has-aura');
      avatarContainer.style.setProperty('--aura-gradient', gradient);
    } else {
      avatarContainer.classList.remove('has-aura');
      avatarContainer.style.removeProperty('--aura-gradient');
    }
  }

  function normalizeBalanceValue(raw) {
    if (raw === null || raw === undefined) {
      return 0;
    }
    const number = Number(raw);
    if (!Number.isFinite(number)) {
      return 0;
    }
    return Math.max(0, Math.floor(number));
  }

  function readStoredBalance() {
    return normalizeBalanceValue(localStorage.getItem(BALANCE_KEY));
  }

  function applyBalanceToUI(balance) {
    const formatted = balance.toLocaleString('pt-BR');
    const targets = document.querySelectorAll('[data-balance-value]');
    targets.forEach((element) => {
      element.textContent = formatted;
    });
  }

  async function preloadAppContent() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${API_BASE_URL}/api/content`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error('Conteúdo indisponível');
      }
      const payload = await response.json();
      localStorage.setItem(
        APP_CONTENT_CACHE_KEY,
        JSON.stringify({ payload, updatedAt: Date.now() })
      );
      return payload;
    } catch (error) {
      console.warn('Não foi possível pré-carregar os conteúdos do app.', error);
      clearTimeout(timeout);
      return null;
    }
  }

  function dispatchBalanceChange(balance) {
    applyBalanceToUI(balance);
    document.dispatchEvent(new CustomEvent('playtalk:balance-change', {
      detail: { balance }
    }));
  }

  function setStoredBalance(balance, { emitEvent = true } = {}) {
    const normalized = normalizeBalanceValue(balance);
    localStorage.setItem(BALANCE_KEY, String(normalized));
    if (emitEvent) {
      dispatchBalanceChange(normalized);
    } else {
      applyBalanceToUI(normalized);
    }
    return normalized;
  }

  function addToBalance(delta) {
    const normalizedDelta = normalizeBalanceValue(delta);
    if (normalizedDelta === 0) {
      const current = readStoredBalance();
      dispatchBalanceChange(current);
      return current;
    }
    const updated = readStoredBalance() + normalizedDelta;
    return setStoredBalance(updated);
  }

  function resetBalance() {
    setStoredBalance(0);
  }

  function initBalanceUI() {
    dispatchBalanceChange(readStoredBalance());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBalanceUI, { once: true });
  } else {
    initBalanceUI();
  }

  window.playtalkBalance = {
    getBalance: () => readStoredBalance(),
    add: addToBalance,
    set: (value) => setStoredBalance(value),
    reset: resetBalance
  };

  window.addEventListener('storage', (event) => {
    if (event.key === BALANCE_KEY) {
      applyBalanceToUI(normalizeBalanceValue(event.newValue));
    }
  });

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
        if (key === 'playerBalance') {
          setStoredBalance(value, { emitEvent: false });
        } else {
          localStorage.setItem(key, serializeValue(value, schema));
        }
      }
    }
    applyBalanceToUI(readStoredBalance());
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
    return Math.round(15 * Math.pow(normalized, 1.5));
  }

  function readLevelProgress() {
    const raw = localStorage.getItem('generalProgress');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const level = Number.isFinite(parsed.level) && parsed.level > 0 ? Math.floor(parsed.level) : 1;
        const xp = Number.isFinite(parsed.xp) && parsed.xp >= 0 ? Math.floor(parsed.xp) : 0;
        return { level, xp };
      } catch (err) {
        console.warn('Não foi possível ler o progresso de nível.', err);
      }
    }
    const legacyRaw = localStorage.getItem('levelProgress');
    if (legacyRaw) {
      try {
        const parsedLegacy = JSON.parse(legacyRaw);
        const level = Number.isFinite(parsedLegacy.level) && parsedLegacy.level > 0
          ? Math.floor(parsedLegacy.level)
          : 1;
        return { level, xp: 0 };
      } catch (err) {
        console.warn('Não foi possível migrar o progresso antigo de nível.', err);
      }
    }
    return {
      level: 1,
      xp: 0
    };
  }

  function getStoredLevel() {
    const progress = readLevelProgress();
    return progress.level;
  }

  function applyLevelToHeader(level, ratio = 0) {
    const normalizedLevel = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
    const normalizedRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
    const levelEl = document.getElementById('header-level');
    if (levelEl) {
      levelEl.textContent = `Nível ${normalizedLevel}`;
    }
    const avatarContainer = document.getElementById('header-avatar-container');
    if (avatarContainer) {
      avatarContainer.dataset.level = String(normalizedLevel);
      avatarContainer.title = `Nível ${normalizedLevel}`;
      const progressDegrees = (normalizedRatio * 360).toFixed(1);
      avatarContainer.style.setProperty('--avatar-progress', `${progressDegrees}deg`);
    }
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
    const logoutButtons = Array.from(document.querySelectorAll('[data-role="logout"]'));
    const nameEl = document.getElementById('header-username');
    const avatarEl = document.getElementById('header-avatar');
    const user = readStoredCurrentUser();
    const displayName = user
      ? (getDisplayName(user) || user.username || 'Jogador')
      : 'Visitante';
    const levelProgress = readLevelProgress();
    const storedLevel = levelProgress.level || 1;
    const requiredForLevel = getLevelRequirement(storedLevel);
    const levelRatio = requiredForLevel > 0
      ? Math.max(0, Math.min(1, (levelProgress.xp || 0) / requiredForLevel))
      : 0;
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
    applyLevelToHeader(storedLevel, levelRatio);

    if (avatarEl) {
      if (avatarEl.getAttribute('src') !== avatarUrl) {
        avatarEl.src = avatarUrl;
      }
      avatarEl.alt = `Foto de ${displayName}`;
    }

    if (loginBtn) {
      loginBtn.style.display = user ? 'none' : 'inline-flex';
    }
    logoutButtons.forEach(button => {
      const isProfilePage = Boolean(button.closest('.page-profile'));
      const isSwitchButton = button.dataset.switchAccount === 'true';
      if (user) {
        button.disabled = false;
        button.style.display = 'inline-flex';
        return;
      }
      button.disabled = !isSwitchButton;
      button.style.display = isProfilePage ? 'inline-flex' : 'none';
    });
    applyBalanceToUI(readStoredBalance());
    if (!user && typeof closeUserMenu === 'function') {
      closeUserMenu();
    }
    if (user && typeof closeLoginFlowHandler === 'function') {
      closeLoginFlowHandler();
    }
    updateHeaderAura();
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

  async function handleLogout(options = {}) {
    const { stayOnPage = false, redirectToLogin = false } = options;
    const current = readStoredCurrentUser();
    if (current) {
      await updateUserSnapshot();
    }
    setCurrentUser(null);
    clearProgressStorage();
    resetBalance();
    updateAuthStatus();
    dispatchUserChange();
    const onProfilePage = document.body && document.body.classList.contains('page-profile');
    if (onProfilePage && !stayOnPage) {
      window.location.href = 'index.html';
      return;
    }
    if (redirectToLogin) {
      window.location.href = 'login.html';
      return;
    }
    if (typeof openLoginFlowHandler === 'function') {
      openLoginFlowHandler();
      return;
    }
    if (!stayOnPage) {
      window.location.href = 'login.html';
    }
  }

  async function finalizeLoginSession(user) {
    setCurrentUser(user);
    applyUserDataToStorage(user);
    await preloadAppContent();
    updateAuthStatus();
    dispatchUserChange();
  }

  async function completeLoginFlow({ username, password }) {
    if (!username || !password) {
      throw new Error('Informe usuário e senha.');
    }

    try {
      const user = await loginRequest(username, password);
      await finalizeLoginSession(user);
    } catch (loginError) {
      try {
        const user = await registerRequest(username, password);
        await finalizeLoginSession(user);
      } catch (registerError) {
        const message =
          (registerError && registerError.message) ||
          (loginError && loginError.message) ||
          'Não foi possível concluir o acesso.';
        const error = new Error(message);
        error.step = 'password';
        throw error;
      }
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
    const logoutButtons = Array.from(document.querySelectorAll('[data-role="logout"]'));
    const flow = document.getElementById('login-flow');
    const form = document.getElementById('login-flow-form');
    const errorEl = document.getElementById('login-flow-error');
    const statusEl = document.getElementById('login-flow-status');
    const usernameInput = document.getElementById('login-flow-username');
    const passwordInput = document.getElementById('login-flow-password');

    if (!setupLoginFlow.logoutHandler) {
      setupLoginFlow.logoutHandler = (event) => {
        const button = event.target.closest('[data-role="logout"]');
        if (!button) {
          return;
        }
        event.preventDefault();
        const stayOnPage = button.dataset.switchAccount === 'true';
        const redirectToLogin = button.dataset.switchAccount === 'true';
        handleLogout({ stayOnPage, redirectToLogin });
      };
      document.addEventListener('click', setupLoginFlow.logoutHandler);
    }

    if (!flow || !form || !usernameInput || !passwordInput) {
      openLoginFlowHandler = null;
      closeLoginFlowHandler = null;
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          window.location.href = 'login.html';
        });
      }
      return;
    }

    if (flow.classList.contains('hidden')) {
      flow.setAttribute('aria-hidden', 'true');
    }

    function setError(message) {
      if (errorEl) {
        errorEl.textContent = message || '';
      }
      if (message && statusEl) {
        statusEl.textContent = '';
      }
    }

    function setStatus(message) {
      if (statusEl) {
        statusEl.textContent = message || '';
      }
    }

    function setButtonActive(active) {
      if (loginBtn) {
        loginBtn.classList.toggle('is-active', Boolean(active));
      }
    }

    function resetFlow() {
      form.reset();
      setError('');
      setStatus('');
      usernameInput.focus();
    }

    function openFlow() {
      resetFlow();
      flow.classList.remove('hidden');
      flow.setAttribute('aria-hidden', 'false');
      document.body.classList.add('login-flow-open');
      setButtonActive(true);
    }

    function closeFlow() {
      flow.classList.add('hidden');
      flow.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('login-flow-open');
      setError('');
      setStatus('');
      setButtonActive(false);
    }

    openLoginFlowHandler = openFlow;
    closeLoginFlowHandler = closeFlow;

    if (loginBtn) {
      loginBtn.addEventListener('click', () => openFlow());
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError('');

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        setError('Informe usuário e senha.');
        return;
      }

      setStatus('Processando...');
      try {
        await completeLoginFlow({ username, password });
        setError('');
        setStatus('Tudo pronto! Bem-vindo ao PlayTalk.');
        const onLoginPage = document.body && document.body.classList.contains('page-login');
        setTimeout(() => {
          closeFlow();
          if (onLoginPage) {
            window.location.href = 'inplay.html';
          }
        }, 800);
      } catch (err) {
        console.error('Erro ao concluir fluxo de acesso:', err);
        const message = err && err.message ? err.message : 'Não foi possível concluir o acesso.';
        setError(message);
        const stepName = err && err.step ? err.step : 'password';
        if (stepName === 'password') {
          passwordInput.select();
        } else {
          usernameInput.select();
        }
      }
    });

    flow.addEventListener('click', (event) => {
      if (event.target === flow) {
        closeFlow();
      }
    });

    Array.from(flow.querySelectorAll('[data-login-close]')).forEach((button) => {
      button.addEventListener('click', () => closeFlow());
    });
  }

  function setupHeaderNavigation() {
    const avatarContainer = document.getElementById('header-avatar-container');
    if (!avatarContainer || avatarContainer.dataset.homeNavBound === 'true') {
      return;
    }
    avatarContainer.dataset.homeNavBound = 'true';
    avatarContainer.style.cursor = 'pointer';
    avatarContainer.addEventListener('click', () => {
      if (window.location.pathname.endsWith('index.html')) {
        window.location.hash = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.location.href = 'index.html';
      }
    });
  }

  async function init() {
    readStoredCurrentUser();
    const user = cachedCurrentUser;
    const isLoginPage = document.body && document.body.classList.contains('page-login');

    if (user) {
      applyUserDataToStorage(user);
    }

    updateAuthStatus();
    setupUserMenu();
    setupLoginFlow();
    setupHeaderNavigation();
    updateHeaderAura();

    window.addEventListener('beforeunload', () => {
      updateUserSnapshot({ useBeacon: true });
    });

    if (!user) {
      if (typeof openLoginFlowHandler === 'function') {
        openLoginFlowHandler();
      } else if (!isLoginPage) {
        window.location.href = 'login.html';
        return;
      }
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

    const PAGE_MANIFEST = {
      'index.html': { hash: '#home', scripts: ['js/main.js'], classes: ['page-home'] },
      'fun.html': { hash: '#fun', scripts: ['js/fun-page.js'], classes: ['page-fun'] },
      'play.html': { hash: '#play', scripts: ['js/play.js'], classes: ['page-play'] },
      'ranking.html': { hash: '#ranking', scripts: ['js/ranking.js'], classes: ['page-ranking'] },
      'perfil.html': { hash: '#perfil', scripts: ['js/profile.js'], classes: ['page-profile'] }
    };

    const transitionClasses = new Set(['page-transition-ready', 'page-transition-leave']);
    const loadedScripts = new Set();
    const pageCache = new Map();
    const parser = new DOMParser();
    const insertionAnchor = document.getElementById('login-flow') || document.querySelector('footer.page-footer');

    const resolvePathKey = (href) => {
      const url = new URL(href, window.location.href);
      const path = url.pathname.replace(/\/+$/, '');
      const segments = path.split('/').filter(Boolean);
      const last = segments.length ? segments[segments.length - 1] : 'index.html';
      return last || 'index.html';
    };

    const initialKey = resolvePathKey(window.location.href);
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
        bodyClasses: Array.from(doc.body.classList)
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

    const getCurrentNavIndex = () => {
      const matchedIndex = navLinks.findIndex(link => resolvePathKey(link.getAttribute('href') || '') === currentKey);
      return matchedIndex === -1 ? 0 : matchedIndex;
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
        navigateTo(navLinks[targetIndex].getAttribute('href'), { pushState: true });
      }
    }, { passive: true });

    window.addEventListener('popstate', event => {
      const state = event.state && event.state.path ? event.state.path : initialKey;
      navigateTo(state, { pushState: false });
    });

    const initialUrl = new URL(baseUrl.href);
    initialUrl.hash = initialManifest && initialManifest.hash ? initialManifest.hash : window.location.hash;
    history.replaceState({ path: currentKey }, '', initialUrl.href);
    setActiveNav(currentKey);

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
    if (!detail) {
      updateAuthStatus();
      return;
    }
    const ratio = Number.isFinite(detail.ratio) ? detail.ratio : 0;
    applyLevelToHeader(detail.level, ratio);
  });

  window.addEventListener('storage', (event) => {
    if (!event) {
      return;
    }

    const watchedKeys = ['generalProgress', 'modeProgress', 'displayName', 'avatar', 'medalHistory', 'pastaAtual'];
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

  document.addEventListener('playtalk:medal-history-change', () => {
    updateHeaderAura();
  });
})();
