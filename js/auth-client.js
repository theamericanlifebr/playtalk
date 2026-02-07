(function(global) {
  if (!global) {
    return;
  }

  const storage = global.playtalkStorage || global.localStorage;
  const TOKEN_KEY = 'playtalk.auth.token';
  const USER_KEY = 'playtalk.auth.user';

  function readStoredUser() {
    try {
      const raw = storage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Não foi possível ler usuário salvo:', error);
      return null;
    }
  }

  function writeSession(token, user) {
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(user || null));
  }

  function clearSession() {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
  }

  function getToken() {
    const token = storage.getItem(TOKEN_KEY);
    return typeof token === 'string' && token ? token : null;
  }

  async function request(path, options) {
    const response = await fetch(path, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || 'Falha na requisição de autenticação.');
    }

    return payload;
  }

  async function register(username, password) {
    const payload = await request('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    writeSession(payload.token, payload.user);
    return payload.user;
  }

  async function login(username, password) {
    const payload = await request('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    writeSession(payload.token, payload.user);
    return payload.user;
  }

  async function getMe() {
    const token = getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = await request('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      storage.setItem(USER_KEY, JSON.stringify(payload.user || null));
      return payload.user || null;
    } catch (error) {
      clearSession();
      return null;
    }
  }

  async function updateUserData(dataPatch) {
    const token = getToken();
    const user = readStoredUser();

    if (!token || !user || !user.key) {
      throw new Error('É necessário estar logado para atualizar os dados.');
    }

    const payload = await request('/api/users/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        key: user.key,
        data: dataPatch
      })
    });

    storage.setItem(USER_KEY, JSON.stringify(payload.user || null));
    return payload.user;
  }

  function getCurrentUser() {
    return readStoredUser();
  }

  function logout() {
    clearSession();
  }

  global.playtalkAuth = {
    register,
    login,
    getMe,
    updateUserData,
    getCurrentUser,
    getToken,
    logout
  };
})(typeof window !== 'undefined' ? window : null);
