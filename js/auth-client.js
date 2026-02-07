(function() {
  const TOKEN_KEY = 'playtalk_auth_token';
  const USER_KEY = 'playtalk_auth_user';
  const AUTH_MODAL_ID = 'playtalk-auth-modal';

  const state = {
    token: null,
    user: null,
    initialized: false,
    persistTimeout: null
  };

  function safeJsonParse(raw, fallback = null) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function setMessage(el, message, isError = true) {
    if (!el) return;
    el.textContent = message || '';
    el.style.color = isError ? '' : '#2e7d32';
  }

  function getHeaderElements() {
    const nameEl = document.querySelector('.site-header__name');
    const profileRoot = document.querySelector('.site-header__profile');
    return { nameEl, profileRoot };
  }

  function loadSession() {
    state.token = localStorage.getItem(TOKEN_KEY) || null;
    state.user = safeJsonParse(localStorage.getItem(USER_KEY), null);
  }

  function saveSession({ token, user }) {
    state.token = token;
    state.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    updateHeaderState();
  }

  function clearSession() {
    state.token = null;
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    updateHeaderState();
  }

  async function api(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(path, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Erro na autenticação.');
    }

    return data;
  }

  function ensureAuthButton() {
    const { profileRoot } = getHeaderElements();
    if (!profileRoot) return null;

    let actionWrap = profileRoot.querySelector('.site-header__auth-actions');
    if (!actionWrap) {
      actionWrap = document.createElement('div');
      actionWrap.className = 'site-header__auth-actions';
      profileRoot.appendChild(actionWrap);
    }

    let authButton = actionWrap.querySelector('button[data-auth-action="toggle-modal"]');
    if (!authButton) {
      authButton = document.createElement('button');
      authButton.type = 'button';
      authButton.className = 'site-header__auth-btn';
      authButton.dataset.authAction = 'toggle-modal';
      authButton.addEventListener('click', () => openAuthModal('login'));
      actionWrap.appendChild(authButton);
    }

    let logoutButton = actionWrap.querySelector('button[data-auth-action="logout"]');
    if (!logoutButton) {
      logoutButton = document.createElement('button');
      logoutButton.type = 'button';
      logoutButton.className = 'site-header__auth-btn site-header__auth-btn--ghost';
      logoutButton.dataset.authAction = 'logout';
      logoutButton.textContent = 'Sair';
      logoutButton.addEventListener('click', logout);
      actionWrap.appendChild(logoutButton);
    }

    return { authButton, logoutButton };
  }

  function updateHeaderState() {
    const { nameEl } = getHeaderElements();
    const buttons = ensureAuthButton();

    if (!nameEl || !buttons) return;

    if (state.user && state.user.username) {
      nameEl.textContent = state.user.username;
      buttons.authButton.textContent = 'Conta';
      buttons.logoutButton.hidden = false;
    } else {
      nameEl.textContent = 'PlayTalk';
      buttons.authButton.textContent = 'Entrar';
      buttons.logoutButton.hidden = true;
    }
  }

  function ensureAuthModal() {
    let modal = document.getElementById(AUTH_MODAL_ID);
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = AUTH_MODAL_ID;
    modal.className = 'playtalk-auth-modal';
    modal.setAttribute('hidden', 'hidden');
    modal.innerHTML = `
      <div class="playtalk-auth-modal__overlay" data-auth-action="close"></div>
      <div class="auth-modal-content" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button class="auth-close" type="button" data-auth-action="close" aria-label="Fechar">×</button>
        <h2 id="auth-modal-title">Acesse sua conta</h2>
        <div class="auth-tabs">
          <button class="auth-tab active" type="button" data-tab="login">Login</button>
          <button class="auth-tab" type="button" data-tab="register">Cadastro</button>
        </div>

        <form class="auth-form active" data-form="login">
          <label>Usuário
            <input name="username" type="text" autocomplete="username" required minlength="3" />
          </label>
          <label>Senha
            <input name="password" type="password" autocomplete="current-password" required minlength="8" />
          </label>
          <button class="auth-submit" type="submit">Entrar</button>
        </form>

        <form class="auth-form" data-form="register">
          <label>Usuário
            <input name="username" type="text" autocomplete="username" required minlength="3" />
          </label>
          <label>Senha
            <input name="password" type="password" autocomplete="new-password" required minlength="8" />
          </label>
          <button class="auth-submit" type="submit">Criar conta</button>
        </form>

        <p class="auth-message" data-auth-message></p>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      const action = event.target && event.target.dataset ? event.target.dataset.authAction : null;
      if (action === 'close') {
        closeAuthModal();
      }

      const tab = event.target && event.target.dataset ? event.target.dataset.tab : null;
      if (tab) {
        switchTab(modal, tab);
      }
    });

    const loginForm = modal.querySelector('form[data-form="login"]');
    const registerForm = modal.querySelector('form[data-form="register"]');

    loginForm.addEventListener('submit', (event) => handleSubmit(event, 'login'));
    registerForm.addEventListener('submit', (event) => handleSubmit(event, 'register'));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hasAttribute('hidden')) {
        closeAuthModal();
      }
    });

    return modal;
  }

  function switchTab(modal, activeTab) {
    const tabs = modal.querySelectorAll('.auth-tab');
    const forms = modal.querySelectorAll('.auth-form');

    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === activeTab);
    });

    forms.forEach((form) => {
      form.classList.toggle('active', form.dataset.form === activeTab);
    });

    const message = modal.querySelector('[data-auth-message]');
    setMessage(message, '');
  }

  function openAuthModal(tab = 'login') {
    const modal = ensureAuthModal();
    modal.removeAttribute('hidden');
    switchTab(modal, tab);
  }

  function closeAuthModal() {
    const modal = ensureAuthModal();
    modal.setAttribute('hidden', 'hidden');
  }

  async function handleSubmit(event, mode) {
    event.preventDefault();

    const form = event.currentTarget;
    const message = document.querySelector('[data-auth-message]');
    const username = form.username.value.trim();
    const password = form.password.value;

    setMessage(message, '');

    if (!username || !password) {
      setMessage(message, 'Preencha usuário e senha.');
      return;
    }

    try {
      const endpoint = mode === 'register' ? '/api/users/register' : '/api/users/login';
      const response = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      saveSession({ token: response.token, user: response.user });
      setMessage(message, mode === 'register' ? 'Conta criada com sucesso!' : 'Login realizado com sucesso!', false);
      setTimeout(() => closeAuthModal(), 300);
    } catch (error) {
      setMessage(message, error.message || 'Falha na autenticação.');
    }
  }

  async function validateExistingSession() {
    if (!state.token) {
      updateHeaderState();
      return;
    }

    try {
      const response = await api('/api/users', { method: 'GET' });
      saveSession({ token: state.token, user: response.user });
    } catch (error) {
      clearSession();
    }
  }

  async function logout() {
    clearSession();
  }

  async function persistProgress() {
    if (!state.token || !state.user || !state.user.key) {
      return;
    }

    const settings = window.playtalkSettings && typeof window.playtalkSettings.loadSettings === 'function'
      ? window.playtalkSettings.loadSettings()
      : null;

    const payload = {
      key: state.user.key,
      data: {
        lastClientSyncAt: new Date().toISOString(),
        clientSettings: settings || {}
      }
    };

    try {
      await api('/api/users/update', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.warn('Falha ao persistir progresso remoto:', error.message || error);
    }
  }

  function schedulePersistProgress(delayMs = 500) {
    if (state.persistTimeout) {
      clearTimeout(state.persistTimeout);
    }
    state.persistTimeout = setTimeout(() => {
      persistProgress();
    }, delayMs);
  }

  function installStorageListeners() {
    window.addEventListener('playtalk-storage', () => schedulePersistProgress(900));
    window.addEventListener('beforeunload', () => {
      if (state.token) {
        persistProgress();
      }
    });
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    loadSession();
    updateHeaderState();
    ensureAuthModal();
    validateExistingSession();
    installStorageListeners();
  }

  window.playtalkAuth = {
    init,
    open: openAuthModal,
    logout,
    getToken: () => state.token,
    getUser: () => state.user,
    isAuthenticated: () => Boolean(state.token && state.user && state.user.key),
    persistProgress,
    schedulePersistProgress
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
