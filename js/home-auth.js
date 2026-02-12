(() => {
  const AUTH_TOKEN_KEY = 'playtalk-auth-token';
  const AUTH_USER_KEY = 'playtalk-auth-user';

  const authPanel = document.getElementById('auth-panel');
  const loginForm = document.getElementById('auth-login-form');
  const submitButton = document.getElementById('auth-submit-btn');
  const simpleErrorBox = document.getElementById('auth-error-simple');
  const technicalErrorBox = document.getElementById('auth-error-technical');
  const authUser = document.getElementById('auth-user');
  const logoutButton = document.getElementById('auth-logout-btn');

  const clearFeedback = () => {
    if (simpleErrorBox) {
      simpleErrorBox.textContent = '';
      simpleErrorBox.classList.add('is-hidden');
    }

    if (technicalErrorBox) {
      technicalErrorBox.textContent = '';
      technicalErrorBox.classList.add('is-hidden');
    }
  };

  const getStoredUser = () => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  };

  const getStoredToken = () => localStorage.getItem(AUTH_TOKEN_KEY) || '';

  const setAuthenticatedState = (user, token) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user || {}));

    if (authUser) {
      authUser.textContent = user && user.email ? `Logado como: ${user.email}` : 'Login realizado.';
      authUser.classList.remove('is-hidden');
    }

    if (logoutButton) {
      logoutButton.classList.remove('is-hidden');
    }

    if (loginForm) {
      loginForm.classList.add('is-hidden');
    }

    clearFeedback();
    window.dispatchEvent(new CustomEvent('playtalk:auth-changed', { detail: { authenticated: true, user } }));
  };

  const clearAuthenticatedState = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    if (authUser) {
      authUser.textContent = '';
      authUser.classList.add('is-hidden');
    }

    if (logoutButton) {
      logoutButton.classList.add('is-hidden');
    }

    if (loginForm) {
      loginForm.classList.remove('is-hidden');
    }

    window.dispatchEvent(new CustomEvent('playtalk:auth-changed', { detail: { authenticated: false } }));
  };

  const renderApiError = async (response) => {
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    const simpleMessage = payload && payload.message
      ? payload.message
      : 'Não foi possível fazer login. Tente novamente.';

    if (simpleErrorBox) {
      simpleErrorBox.textContent = simpleMessage;
      simpleErrorBox.classList.remove('is-hidden');
    }

    const technical = payload && payload.technical ? payload.technical : {
      status: response.status,
      code: payload && payload.code ? payload.code : 'AUTH_API_ERROR'
    };

    if (technicalErrorBox) {
      technicalErrorBox.textContent = JSON.stringify(technical, null, 2);
      technicalErrorBox.classList.remove('is-hidden');
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    clearFeedback();

    const formData = new FormData(loginForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      if (simpleErrorBox) {
        simpleErrorBox.textContent = 'Preencha email e senha para continuar.';
        simpleErrorBox.classList.remove('is-hidden');
      }
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Entrando...';
    }

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        await renderApiError(response);
        return;
      }

      const data = await response.json();
      if (!data || !data.token) {
        if (simpleErrorBox) {
          simpleErrorBox.textContent = 'Resposta inválida do servidor de autenticação.';
          simpleErrorBox.classList.remove('is-hidden');
        }

        if (technicalErrorBox) {
          technicalErrorBox.textContent = JSON.stringify({ code: 'AUTH_INVALID_RESPONSE', data }, null, 2);
          technicalErrorBox.classList.remove('is-hidden');
        }
        return;
      }

      setAuthenticatedState(data.user || null, data.token);
    } catch (error) {
      if (simpleErrorBox) {
        simpleErrorBox.textContent = 'Falha de conexão ao autenticar. Verifique sua internet e tente novamente.';
        simpleErrorBox.classList.remove('is-hidden');
      }

      if (technicalErrorBox) {
        technicalErrorBox.textContent = JSON.stringify({ code: 'AUTH_NETWORK_ERROR', message: error.message }, null, 2);
        technicalErrorBox.classList.remove('is-hidden');
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Entrar';
      }
    }
  };

  window.playtalkAuth = {
    isAuthenticated: () => Boolean(getStoredToken()),
    getUser: getStoredUser,
    getToken: getStoredToken,
    logout: clearAuthenticatedState,
    showPanel: () => authPanel && authPanel.classList.remove('is-hidden'),
    hidePanel: () => authPanel && authPanel.classList.add('is-hidden')
  };

  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      clearAuthenticatedState();
      clearFeedback();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    const token = getStoredToken();
    const user = getStoredUser();
    if (token) {
      setAuthenticatedState(user, token);
      return;
    }
    clearAuthenticatedState();
  });
})();
