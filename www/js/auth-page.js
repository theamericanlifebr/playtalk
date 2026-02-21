(function initAuthPage() {
  const form = document.getElementById('auth-form');
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const submitBtn = document.getElementById('auth-submit');
  const messageBox = document.getElementById('auth-message');
  const passwordInput = document.getElementById('password');

  if (!form || !loginTab || !registerTab || !submitBtn || !messageBox || !passwordInput) {
    return;
  }

  let mode = 'login';

  function setMode(nextMode) {
    mode = nextMode;
    const isLogin = mode === 'login';
    loginTab.classList.toggle('is-active', isLogin);
    registerTab.classList.toggle('is-active', !isLogin);
    loginTab.setAttribute('aria-selected', String(isLogin));
    registerTab.setAttribute('aria-selected', String(!isLogin));
    submitBtn.textContent = isLogin ? 'Entrar' : 'Criar conta';
    passwordInput.autocomplete = isLogin ? 'current-password' : 'new-password';
    showMessage('');
  }

  function showMessage(text, type) {
    messageBox.textContent = text || '';
    messageBox.classList.remove('is-error', 'is-success');
    if (type) {
      messageBox.classList.add(type === 'error' ? 'is-error' : 'is-success');
    }
  }

  async function postAuth(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Não foi possível autenticar.');
    }

    if (data.token) {
      localStorage.setItem('playtalk_auth_token', data.token);
    }
    if (data.user) {
      localStorage.setItem('playtalk_auth_user', JSON.stringify(data.user));
    }
  }

  loginTab.addEventListener('click', () => setMode('login'));
  registerTab.addEventListener('click', () => setMode('register'));

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const email = String(form.email.value || '').trim();
    const password = String(form.password.value || '').trim();

    if (!email || !password) {
      showMessage('Preencha e-mail e senha.', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('A senha precisa ter pelo menos 6 caracteres.', 'error');
      return;
    }

    submitBtn.disabled = true;
    showMessage(mode === 'login' ? 'Entrando...' : 'Criando conta...');

    try {
      await postAuth(mode === 'login' ? '/login' : '/register', { email, password });
      showMessage('Sucesso! Redirecionando...', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  fetch('/auth/session', { credentials: 'include' })
    .then(response => {
      if (response.ok) {
        window.location.href = '/';
      }
    })
    .catch(() => {});
})();
