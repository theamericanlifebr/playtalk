(function () {
  const API_BASE_URL = window.playtalkAuthApiBase || '';
  const CURRENT_USER_KEY = 'currentUser';
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
    tutorialDone: { type: 'boolean', default: false },
    ilifeDone: { type: 'boolean', default: false },
    levelDetails: { type: 'json', default: [] },
    totalTime: { type: 'number', default: 0 },
    shareResults: { type: 'boolean', default: false }
  };

  let cachedCurrentUser = null;

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

  function closeModal(modal) {
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function openModal(modal) {
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function getStoredLevel() {
    const stored = parseInt(localStorage.getItem('pastaAtual'), 10);
    return Number.isFinite(stored) && stored > 0 ? stored : 1;
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
    const statusEl = document.getElementById('auth-status');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const levelIcon = document.getElementById('nivel-indicador');
    const user = readStoredCurrentUser();
    if (statusEl) {
      if (user) {
        const name = getDisplayName(user) || user.username || 'Jogador';
        statusEl.textContent = name;
        statusEl.dataset.authenticated = 'true';
      } else {
        statusEl.textContent = 'Convidado';
        statusEl.dataset.authenticated = 'false';
      }
    }
    if (loginBtn) {
      loginBtn.textContent = 'Entrar';
      loginBtn.style.display = user ? 'none' : 'inline-flex';
    }
    if (logoutBtn) {
      logoutBtn.style.display = user ? 'inline-flex' : 'none';
    }
    if (levelIcon) {
      levelIcon.style.opacity = user ? '1' : '0.35';
      levelIcon.style.filter = user ? 'none' : 'grayscale(0.4)';
      levelIcon.setAttribute('aria-hidden', user ? 'false' : 'true');
      levelIcon.setAttribute('title', user ? `Nível ${getStoredLevel()}` : 'Nível bloqueado');
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

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const username = form.querySelector('input[name="login-username"]').value.trim();
    const password = form.querySelector('input[name="login-password"]').value;
    const messageEl = document.getElementById('auth-message');

    if (!username || !password) {
      if (messageEl) messageEl.textContent = 'Informe usuário e senha.';
      return;
    }

    try {
      const user = await loginRequest(username, password);
      setCurrentUser(user);
      applyUserDataToStorage(user);
      updateAuthStatus();
      closeModal(document.getElementById('auth-modal'));
      if (messageEl) messageEl.textContent = '';
      dispatchUserChange();
    } catch (err) {
      console.error('Erro ao realizar login:', err);
      if (messageEl) messageEl.textContent = err.message || 'Não foi possível realizar login.';
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const username = form.querySelector('input[name="register-username"]').value.trim();
    const password = form.querySelector('input[name="register-password"]').value;
    const confirm = form.querySelector('input[name="register-confirm"]').value;
    const messageEl = document.getElementById('auth-message');

    if (!username || !password || !confirm) {
      if (messageEl) messageEl.textContent = 'Preencha todos os campos.';
      return;
    }

    if (password !== confirm) {
      if (messageEl) messageEl.textContent = 'As senhas não conferem.';
      return;
    }

    try {
      const user = await registerRequest(username, password);
      setCurrentUser(user);
      applyUserDataToStorage(user);
      updateAuthStatus();
      closeModal(document.getElementById('auth-modal'));
      if (messageEl) messageEl.textContent = '';
      dispatchUserChange();
    } catch (err) {
      console.error('Erro ao registrar usuário:', err);
      if (messageEl) messageEl.textContent = err.message || 'Não foi possível registrar usuário.';
    }
  }

  async function handleLogout() {
    await updateUserSnapshot();
    setCurrentUser(null);
    clearProgressStorage();
    updateAuthStatus();
    closeModal(document.getElementById('auth-modal'));
    dispatchUserChange();
  }

  function setupTabs() {
    const tabButtons = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    function activateTab(tab) {
      tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
      forms.forEach(form => {
        form.classList.toggle('active', form.dataset.tab === tab);
      });
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });

    activateTab('login');
  }

  function setupModal() {
    const loginBtn = document.getElementById('login-btn');
    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('auth-close');

    if (loginBtn) {
      if (modal) {
        loginBtn.addEventListener('click', () => openModal(modal));
      } else {
        loginBtn.addEventListener('click', () => {
          window.location.href = 'play.html#login';
        });
      }
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal(modal));
    }
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          closeModal(modal);
        }
      });
    }

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
    if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        handleLogout();
      });
    }

    setupTabs();

    if (modal && window.location.hash === '#login') {
      openModal(modal);
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }

  function setupOnboardingWizard() {
    const wizard = document.getElementById('login-wizard');
    if (!wizard) return;

    const panels = Array.from(wizard.querySelectorAll('.login-wizard__panel'));
    if (!panels.length) return;

    const errors = panels.map(panel => panel.querySelector('.login-wizard__error'));
    const usernameInput = wizard.querySelector('#wizard-username');
    const passwordInput = wizard.querySelector('#wizard-password');
    const confirmInput = wizard.querySelector('#wizard-confirm');
    const finishButton = wizard.querySelector('[data-action="finish"]');
    const state = { username: '', password: '' };
    let busy = false;

    function clearErrors() {
      errors.forEach(error => { if (error) error.textContent = ''; });
    }

    function showStep(index) {
      panels.forEach((panel, idx) => {
        const active = idx === index;
        panel.classList.toggle('active', active);
        panel.setAttribute('aria-hidden', active ? 'false' : 'true');
        if (active && errors[idx]) errors[idx].textContent = '';
      });
      const focusInput = panels[index].querySelector('input');
      if (focusInput) {
        setTimeout(() => focusInput.focus(), 60);
      }
    }

    function showWizard() {
      wizard.classList.remove('hidden');
      wizard.setAttribute('aria-hidden', 'false');
      document.body.classList.add('onboarding-active');
      showStep(0);
      if (usernameInput) usernameInput.focus();
    }

    function hideWizard() {
      wizard.classList.add('hidden');
      wizard.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('onboarding-active');
    }

    const hasUser = !!readStoredCurrentUser();
    const onboardingDone = localStorage.getItem('onboardingComplete') === 'true';
    if (hasUser || onboardingDone) {
      hideWizard();
      return;
    }

    showWizard();

    panels.forEach((panel, idx) => {
      const nextBtn = panel.querySelector('[data-action="next"]');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (busy) return;
          if (idx === 0) {
            const value = (usernameInput ? usernameInput.value.trim() : '');
            if (!value) {
              if (errors[idx]) errors[idx].textContent = 'Informe um nome de usuário.';
              return;
            }
            if (value.length < 3) {
              if (errors[idx]) errors[idx].textContent = 'Use pelo menos 3 caracteres.';
              return;
            }
            state.username = value;
            showStep(1);
            return;
          }
          if (idx === 1) {
            const value = passwordInput ? passwordInput.value : '';
            if (!value || value.length < 4) {
              if (errors[idx]) errors[idx].textContent = 'A senha deve ter pelo menos 4 caracteres.';
              return;
            }
            state.password = value;
            showStep(2);
          }
        });
      }
      const backBtn = panel.querySelector('[data-action="back"]');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          if (busy) return;
          const target = Math.max(0, idx - 1);
          showStep(target);
        });
      }
    });

    async function completeOnboarding() {
      if (busy) return;
      const confirmation = confirmInput ? confirmInput.value : '';
      if (confirmation !== state.password) {
        if (errors[1]) errors[1].textContent = 'As senhas não coincidem.';
        if (passwordInput) {
          passwordInput.focus();
          passwordInput.select();
        }
        showStep(1);
        return;
      }

      busy = true;
      clearErrors();
      if (finishButton) {
        finishButton.disabled = true;
        finishButton.textContent = 'Criando...';
      }

      try {
        await registerRequest(state.username, state.password);
        const loggedUser = await loginRequest(state.username, state.password);
        setCurrentUser(loggedUser);
        applyUserDataToStorage(loggedUser);
        localStorage.setItem('unlockedModes', JSON.stringify({ 1: true }));
        localStorage.setItem('completedModes', JSON.stringify({}));
        localStorage.setItem('onboardingComplete', 'true');
        updateAuthStatus();
        dispatchUserChange();
        hideWizard();
      } catch (err) {
        console.error('Erro ao criar usuário inicial:', err);
        const message = (err && err.message) ? err.message : 'Não foi possível criar sua conta.';
        if (errors[0]) errors[0].textContent = message;
        showStep(0);
      } finally {
        busy = false;
        if (finishButton) {
          finishButton.disabled = false;
          finishButton.textContent = 'Criar conta';
        }
        if (passwordInput) passwordInput.value = '';
        if (confirmInput) confirmInput.value = '';
        state.password = '';
      }
    }

    if (finishButton) {
      finishButton.addEventListener('click', completeOnboarding);
    }
  }

  async function init() {
    readStoredCurrentUser();
    const user = cachedCurrentUser;

    if (user && user.username && user.password) {
      try {
        const refreshedUser = await loginRequest(user.username, user.password);
        setCurrentUser(refreshedUser);
        applyUserDataToStorage(refreshedUser);
      } catch (err) {
        console.warn('Não foi possível sincronizar usuário atual:', err);
        applyUserDataToStorage(user);
      }
    } else if (user) {
      applyUserDataToStorage(user);
    }

    updateAuthStatus();
    setupModal();
    setupOnboardingWizard();

    window.addEventListener('beforeunload', () => {
      updateUserSnapshot({ useBeacon: true });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  document.addEventListener('playtalk:user-change', () => {
    updateAuthStatus();
  });

  document.addEventListener('playtalk:level-update', () => {
    updateAuthStatus();
  });

  window.addEventListener('storage', (event) => {
    if (['pastaAtual', 'displayName'].includes(event.key)) {
      updateAuthStatus();
    }
  });

  window.playtalkAuth = {
    getCurrentUser: () => readStoredCurrentUser(),
    persistProgress: () => updateUserSnapshot(),
    applyUserData: applyUserDataToStorage,
    createDefaultData
  };
})();
