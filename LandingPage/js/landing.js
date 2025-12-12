(function () {
  const loginButtons = document.querySelectorAll('.js-open-login');
  const loginForm = document.getElementById('login-form');
  const loginNext = document.getElementById('login-next');
  const loginSection = document.getElementById('login');

  loginButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (loginSection) {
        loginSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  if (loginForm && loginNext) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      loginForm.setAttribute('aria-busy', 'true');
      setTimeout(() => {
        loginForm.setAttribute('aria-busy', 'false');
        loginForm.hidden = true;
        loginNext.hidden = false;
        loginNext.focus?.();
      }, 280);
    });
  }
})();
