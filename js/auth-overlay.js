(function () {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay) {
    return;
  }

  const body = document.body;
  const tabButtons = Array.from(overlay.querySelectorAll('.auth-tab-button'));
  const panels = {
    login: overlay.querySelector('#auth-login-panel'),
    register: overlay.querySelector('#auth-register-panel'),
  };
  const feedback = overlay.querySelector('.auth-feedback');
  const loginForm = overlay.querySelector('#overlay-login-form');
  const registerForm = overlay.querySelector('#overlay-register-form');
  const logoutButton = document.getElementById('logout-button');
  const userInfo = document.getElementById('user-info');
  const greeting = document.getElementById('user-greeting');

  function setFeedback(message, type) {
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('error', 'success');
    if (type) {
      feedback.classList.add(type);
    }
  }

  function openOverlay() {
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    body.classList.add('auth-locked');
    setTimeout(() => {
      const input = overlay.querySelector('.auth-panel.active input');
      if (input) {
        input.focus({ preventScroll: true });
      }
    }, 100);
  }

  function closeOverlay() {
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    body.classList.remove('auth-locked');
    setFeedback('');
  }

  function switchTab(target) {
    tabButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.target === target);
    });

    Object.entries(panels).forEach(([key, panel]) => {
      if (!panel) return;
      panel.classList.toggle('active', key === target);
    });

    setFeedback('');
    const activePanel = panels[target];
    if (activePanel) {
      const input = activePanel.querySelector('input');
      if (input) {
        input.focus({ preventScroll: true });
      }
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.target));
  });

  function handleErrorResponse(result, fallbackMessage) {
    const message = result?.message || fallbackMessage;
    setFeedback(message, 'error');
  }

  async function submitLogin(event) {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const payload = {
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || '').trim(),
      securityCode: String(formData.get('securityCode') || '').trim(),
    };

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        handleErrorResponse(result, 'Não foi possível entrar.');
        return;
      }

      setFeedback(result?.message || 'Login realizado com sucesso.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (error) {
      console.error('Erro ao realizar login:', error);
      setFeedback('Ocorreu um erro inesperado. Tente novamente.', 'error');
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    const formData = new FormData(registerForm);

    const password = String(formData.get('password') || '').trim();
    const confirmPassword = String(formData.get('confirmPassword') || '').trim();
    if (password !== confirmPassword) {
      setFeedback('As senhas informadas não coincidem.', 'error');
      return;
    }

    const payload = {
      name: String(formData.get('name') || '').trim(),
      username: String(formData.get('username') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      password,
      securityCode: String(formData.get('securityCode') || '').trim(),
    };

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        handleErrorResponse(result, 'Não foi possível criar sua conta.');
        return;
      }

      setFeedback(result?.message || 'Conta criada com sucesso!', 'success');
      switchTab('login');
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      setFeedback('Ocorreu um erro inesperado. Tente novamente.', 'error');
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error('Falha ao encerrar sessão.');
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }

    if (Array.isArray(window.playtalkProgressKeyList)) {
      window.playtalkProgressKeyList.forEach((key) => localStorage.removeItem(key));
    }
    localStorage.removeItem('currentUser');
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }

  if (loginForm) {
    loginForm.addEventListener('submit', submitLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', submitRegister);
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  function updateUserInfo(session) {
    if (session?.authenticated) {
      const displayName = session.name || session.username || session.email;
      if (greeting) {
        greeting.textContent = `Olá, ${displayName}!`;
      }
      if (userInfo) {
        userInfo.hidden = false;
      }
      closeOverlay();
    } else {
      if (userInfo) {
        userInfo.hidden = true;
      }
      openOverlay();
    }
  }

  window.addEventListener('playtalk:session', (event) => {
    updateUserInfo(event.detail || {});
  });

  if (window.playtalkSession) {
    updateUserInfo(window.playtalkSession);
  }
})();
