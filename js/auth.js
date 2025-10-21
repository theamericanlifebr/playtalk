(function () {
  const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
  const panels = {
    login: document.getElementById('login-panel'),
    register: document.getElementById('register-panel'),
  };
  const feedback = document.querySelector('.feedback');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  async function checkSession() {
    try {
      const response = await fetch('/api/session', { credentials: 'same-origin' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.authenticated) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
    }
  }

  function showFeedback(message, type = '') {
    feedback.textContent = message;
    feedback.classList.remove('error', 'success');
    if (type) {
      feedback.classList.add(type);
    }
  }

  function switchTab(target) {
    tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.target === target));
    Object.entries(panels).forEach(([key, panel]) => {
      panel.classList.toggle('active', key === target);
    });
    showFeedback('');
  }

  async function submitForm(form, endpoint) {
    const formData = new FormData(form);
    const payload = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = result?.message || 'Não foi possível completar a ação.';
        showFeedback(message, 'error');
        return;
      }

      showFeedback(result?.message || 'Tudo certo! Redirecionando...', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 600);
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      showFeedback('Ocorreu um erro inesperado. Tente novamente.', 'error');
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.target));
  });

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitForm(loginForm, '/api/login');
  });

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitForm(registerForm, '/api/register');
  });

  checkSession();
})();
