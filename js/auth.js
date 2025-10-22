(function () {
  const USERS_KEY = 'playtalkUsers';
  const CURRENT_USER_KEY = 'currentUser';
  const PROGRESS_SCHEMA = {
    acertosTotais: { type: 'number', default: 0 },
    errosTotais: { type: 'number', default: 0 },
    tentativasTotais: { type: 'number', default: 0 },
    points: { type: 'number', default: 0 },
    modeStats: { type: 'json', default: {} },
    completedModes: { type: 'json', default: {} },
    unlockedModes: { type: 'json', default: {} },
    modeIntroShown: { type: 'json', default: {} },
    pastaAtual: { type: 'number', default: 1 },
    tutorialDone: { type: 'boolean', default: false },
    ilifeDone: { type: 'boolean', default: false },
    levelDetails: { type: 'json', default: [] },
    totalTime: { type: 'number', default: 0 }
  };

  let cachedUsers = null;
  let cachedCurrentUser = null;

  function loadUsers() {
    if (cachedUsers) return cachedUsers;
    try {
      const stored = localStorage.getItem(USERS_KEY);
      cachedUsers = stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      cachedUsers = {};
    }
    return cachedUsers;
  }

  function saveUsers(users) {
    cachedUsers = users;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
    cachedCurrentUser = user;
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    window.currentUser = cachedCurrentUser;
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

  function normalizeKey(username) {
    return username.trim().toLowerCase();
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

  function updateUserSnapshot() {
    const user = readStoredCurrentUser();
    if (!user) return;
    const users = loadUsers();
    const entryKey = user.key || normalizeKey(user.username || '');
    if (!entryKey) return;
    const snapshot = collectProgressFromStorage();
    user.data = { ...user.data, ...snapshot };
    if (!users[entryKey]) {
      users[entryKey] = {
        username: user.username,
        password: user.password || '',
        data: createDefaultData()
      };
    }
    users[entryKey].data = { ...users[entryKey].data, ...snapshot };
    if (users[entryKey].password && !user.password) {
      user.password = users[entryKey].password;
    }
    saveUsers(users);
    setCurrentUser(user);
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

  function updateAuthStatus() {
    const statusEl = document.getElementById('auth-status');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const user = readStoredCurrentUser();
    if (statusEl) {
      if (user) {
        statusEl.textContent = `Olá, ${user.username}`;
      } else {
        statusEl.textContent = 'Nenhum usuário conectado';
      }
    }
    if (loginBtn) {
      loginBtn.textContent = user ? 'Trocar usuário' : 'Entrar';
    }
    if (logoutBtn) {
      logoutBtn.style.display = user ? 'inline-block' : 'none';
    }
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const username = form.querySelector('input[name="login-username"]').value.trim();
    const password = form.querySelector('input[name="login-password"]').value;
    const messageEl = document.getElementById('auth-message');
    if (!username || !password) {
      if (messageEl) messageEl.textContent = 'Informe usuário e senha.';
      return;
    }
    const key = normalizeKey(username);
    const users = loadUsers();
    const entry = users[key];
    if (!entry || entry.password !== password) {
      if (messageEl) messageEl.textContent = 'Usuário ou senha inválidos.';
      return;
    }
    const user = { username: entry.username || username, key, password: entry.password, data: entry.data || createDefaultData() };
    setCurrentUser(user);
    applyUserDataToStorage(user);
    updateAuthStatus();
    closeModal(document.getElementById('auth-modal'));
    if (messageEl) messageEl.textContent = '';
    dispatchUserChange();
  }

  function handleRegisterSubmit(event) {
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
    const key = normalizeKey(username);
    const users = loadUsers();
    if (users[key]) {
      if (messageEl) messageEl.textContent = 'Usuário já existe.';
      return;
    }
    const data = createDefaultData();
    users[key] = { username, password, data };
    saveUsers(users);
    const user = { username, key, password, data: { ...data } };
    setCurrentUser(user);
    applyUserDataToStorage(user);
    updateAuthStatus();
    closeModal(document.getElementById('auth-modal'));
    if (messageEl) messageEl.textContent = '';
    dispatchUserChange();
  }

  function handleLogout() {
    const users = loadUsers();
    updateUserSnapshot();
    setCurrentUser(null);
    for (const key of Object.keys(PROGRESS_SCHEMA)) {
      localStorage.removeItem(key);
    }
    saveUsers(users);
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
    if (loginBtn && modal) {
      loginBtn.addEventListener('click', () => openModal(modal));
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
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    setupTabs();
  }

  function init() {
    readStoredCurrentUser();
    const user = cachedCurrentUser;
    if (user) {
      applyUserDataToStorage(user);
    }
    updateAuthStatus();
    setupModal();
    window.addEventListener('beforeunload', updateUserSnapshot);
  }

  document.addEventListener('DOMContentLoaded', init);

  window.playtalkAuth = {
    getCurrentUser: () => readStoredCurrentUser(),
    persistProgress: () => {
      updateUserSnapshot();
      updateAuthStatus();
    },
    applyUserData: applyUserDataToStorage
  };
})();
