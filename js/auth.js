(function() {
  const AUTH_TOKEN_KEY = 'playtalkAuthToken';
  const AUTH_USER_KEY = 'playtalkAuthUser';

  const overlay = document.getElementById('auth-modal');
  if (!overlay) {
    return;
  }

  const body = document.body;
  const closeButton = overlay.querySelector('#auth-close');
  const tabButtons = Array.from(overlay.querySelectorAll('.auth-tab'));
  const loginForm = overlay.querySelector('#auth-login-form');
  const registerForm = overlay.querySelector('#auth-register-form');
  const loginMessage = overlay.querySelector('#auth-login-message');
  const registerMessage = overlay.querySelector('#auth-register-message');
  const logoutButton = document.getElementById('logout-button');
  const userName = document.getElementById('auth-user-name');

  const state = {
    token: null,
    user: null
  };
  const apiBaseUrl = (() => {
    if (typeof window === 'undefined') return '';
    const rawBase = window.PLAYTALK_API_BASE_URL;
    if (typeof rawBase !== 'string') return '';
    const trimmed = rawBase.trim();
    return trimmed ? trimmed.replace(/\/+$/, '') : '';
  })();

  const readStoredUser = () => {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Não foi possível ler o usuário salvo.', error);
      return null;
    }
  };

  const updateUserLabel = () => {
    if (!userName) return;
    if (!state.user) {
      userName.textContent = '';
      return;
    }
    const displayName = state.user.username || state.user.key || '';
    userName.textContent = displayName ? `@${displayName}` : '';
  };

  const setOverlayVisibility = (visible) => {
    overlay.classList.toggle('hidden', !visible);
    overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
    body.classList.toggle('auth-locked', visible);
    if (closeButton) {
      const allowClose = !visible;
      closeButton.disabled = !allowClose;
      closeButton.setAttribute('aria-hidden', allowClose ? 'false' : 'true');
    }
  };

  const setLogoutVisible = (visible) => {
    if (!logoutButton) return;
    logoutButton.classList.toggle('is-hidden', !visible);
  };

  const setAuthState = (token, user) => {
    state.token = token || null;
    state.user = user || null;
    if (state.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, state.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(state.user || {}));
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
    updateUserLabel();
    const isAuthenticated = Boolean(state.token);
    setLogoutVisible(isAuthenticated);
    setOverlayVisibility(!isAuthenticated);
  };

  const switchTab = (tabKey) => {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.authTab === tabKey;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    if (loginForm) {
      loginForm.classList.toggle('active', tabKey === 'login');
    }
    if (registerForm) {
      registerForm.classList.toggle('active', tabKey === 'register');
    }
  };

  const setMessage = (target, message = '', isError = true) => {
    if (!target) return;
    target.textContent = message;
    target.style.color = isError ? '' : '#2e7d32';
  };

  const submitAuth = async (endpoint, form, messageTarget) => {
    const formData = new FormData(form);
    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '');
    if (!username || !password) {
      setMessage(messageTarget, 'Preencha usuário e senha.');
      return;
    }
    setMessage(messageTarget, 'Processando...', false);
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }
    try {
      const url = apiBaseUrl
        ? `${apiBaseUrl}/api/users/${endpoint}`
        : `/api/users/${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data || !data.success) {
        const fallbackMessage = endpoint === 'register'
          ? 'Não foi possível criar a conta.'
          : 'Usuário ou senha inválidos.';
        setMessage(messageTarget, data.message || fallbackMessage);
        return;
      }
      setMessage(messageTarget, 'Sucesso! Entrando...', false);
      setAuthState(data.token, data.user);
      if (form) {
        form.reset();
      }
    } catch (error) {
      console.error('Falha ao autenticar:', error);
      setMessage(messageTarget, 'Não foi possível conectar ao servidor.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  };

  const initAuth = () => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = readStoredUser();
    setAuthState(storedToken, storedUser);
    switchTab('login');
  };

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      if (state.token) {
        setOverlayVisibility(false);
      }
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.authTab);
    });
  });

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitAuth('login', loginForm, loginMessage);
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitAuth('register', registerForm, registerMessage);
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      setAuthState(null, null);
      switchTab('login');
    });
  }

  window.playtalkAuth = {
    isAuthenticated: () => Boolean(state.token),
    getToken: () => state.token,
    getUser: () => state.user,
    requireAuth: () => Boolean(state.token),
    persistProgress: () => {}
  };

  document.addEventListener('DOMContentLoaded', initAuth);
})();
