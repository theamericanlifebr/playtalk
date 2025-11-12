(function () {
  const API_BASE_URL = window.playtalkAuthApiBase || '';

  const remoteStorage = (() => {
    const remoteKeys = new Set();
    const cache = new Map();
    const dirtyKeys = new Set();
    const original = {
      getItem: Storage.prototype.getItem,
      setItem: Storage.prototype.setItem,
      removeItem: Storage.prototype.removeItem
    };

    let suppressed = 0;
    let syncTimer = null;
    let syncCallback = null;

    function isRemoteKey(key) {
      return remoteKeys.has(String(key));
    }

    function scheduleSync() {
      if (suppressed || typeof syncCallback !== 'function' || !dirtyKeys.size) {
        return;
      }
      if (syncTimer) {
        return;
      }
      syncTimer = window.setTimeout(() => {
        syncTimer = null;
        if (dirtyKeys.size && typeof syncCallback === 'function') {
          try {
            syncCallback(Array.from(dirtyKeys));
          } finally {
            dirtyKeys.clear();
          }
        }
      }, 1200);
    }

    Storage.prototype.getItem = function getItem(key) {
      if (!isRemoteKey(key)) {
        return original.getItem.call(this, key);
      }
      return cache.has(key) ? cache.get(key) : null;
    };

    Storage.prototype.setItem = function setItem(key, value) {
      if (!isRemoteKey(key)) {
        original.setItem.call(this, key, value);
        return;
      }
      const normalized = value == null ? '' : String(value);
      cache.set(key, normalized);
      if (!suppressed) {
        dirtyKeys.add(key);
        scheduleSync();
      }
    };

    Storage.prototype.removeItem = function removeItem(key) {
      if (!isRemoteKey(key)) {
        original.removeItem.call(this, key);
        return;
      }
      if (cache.has(key)) {
        cache.delete(key);
        if (!suppressed) {
          dirtyKeys.add(key);
          scheduleSync();
        }
      }
    };

    window.addEventListener('beforeunload', () => {
      if (typeof syncCallback === 'function' && dirtyKeys.size) {
        try {
          syncCallback(Array.from(dirtyKeys));
        } catch (err) {
          console.warn('Falha ao sincronizar antes de sair:', err);
        } finally {
          dirtyKeys.clear();
        }
      }
    });

    return {
      register(keys) {
        keys.forEach((key) => {
          if (key) {
            remoteKeys.add(String(key));
          }
        });
      },
      suspend(fn) {
        suppressed += 1;
        try {
          return typeof fn === 'function' ? fn() : undefined;
        } finally {
          suppressed = Math.max(0, suppressed - 1);
          if (!suppressed) {
            scheduleSync();
          }
        }
      },
      load(snapshot = {}) {
        this.suspend(() => {
          cache.clear();
          Object.entries(snapshot).forEach(([key, value]) => {
            if (!isRemoteKey(key)) {
              return;
            }
            cache.set(key, value == null ? '' : String(value));
          });
          dirtyKeys.clear();
        });
      },
      clear() {
        this.suspend(() => {
          cache.clear();
          dirtyKeys.clear();
        });
      },
      setSyncHandler(handler) {
        syncCallback = typeof handler === 'function' ? handler : null;
      },
      getSnapshot() {
        const payload = {};
        cache.forEach((value, key) => {
          payload[key] = value;
        });
        return payload;
      }
    };
  })();

  window.playtalkRemoteStorage = remoteStorage;
  const BALANCE_KEY = 'playerBalance';
  const DEFAULT_AVATAR_URL =
    'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';
  const PROGRESS_SCHEMA = {
    acertosTotais: { type: 'number', default: 0 },
    errosTotais: { type: 'number', default: 0 },
    tentativasTotais: { type: 'number', default: 0 },
    points: { type: 'number', default: 0 },
    playerBalance: { type: 'number', default: 0 },
    displayName: { type: 'string', default: '' },
    modeStats: { type: 'json', default: {} },
    completedModes: { type: 'json', default: {} },
    unlockedModes: { type: 'json', default: {} },
    modeIntroShown: { type: 'json', default: {} },
    generalProgress: { type: 'json', default: { level: 1, xp: 0 } },
    modeProgress: { type: 'json', default: {} },
    tutorialDone: { type: 'boolean', default: false },
    ilifeDone: { type: 'boolean', default: false },
    levelDetails: { type: 'json', default: [] },
    totalTime: { type: 'number', default: 0 },
    shareResults: { type: 'boolean', default: false },
    avatar: { type: 'string', default: DEFAULT_AVATAR_URL },
    medalLog: { type: 'json', default: [] },
    bestCpm: { type: 'number', default: 0 },
    bestSequentialCorrect: { type: 'number', default: 0 },
    currentSequentialCorrect: { type: 'number', default: 0 },
    monthlyAccuracy: { type: 'json', default: {} }
  };

  remoteStorage.register(Object.keys(PROGRESS_SCHEMA));

  const MEDAL_ORDER = ['diamante', 'ouro', 'prata', 'bronze', 'chumbo', 'gesso'];
  const MEDAL_WEIGHTS = {
    diamante: 12,
    ouro: 8,
    prata: 4,
    bronze: 2,
    chumbo: 1,
    gesso: 0
  };
  const MEDAL_GRADIENTS = {
    diamante: ['#7fc8ff', '#d9f3ff'],
    ouro: ['#f5b700', '#ffe680'],
    prata: ['#ced3d9', '#f8f9fb'],
    bronze: ['#a76a3a', '#f1c388'],
    chumbo: ['#6f7a82', '#9aa4ab'],
    gesso: ['#8f6b4a', '#e7d2b5']
  };

  function parseMedalLog(raw) {
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }
          const medal = entry.medal || entry.type;
          if (!MEDAL_WEIGHTS.hasOwnProperty(medal)) {
            return null;
          }
          return {
            medal,
            timestamp: Number(entry.timestamp) || Date.now()
          };
        })
        .filter(Boolean);
    } catch (err) {
      console.warn('Não foi possível analisar o histórico de medalhas:', err);
      return [];
    }
  }

  function buildAuraGradient(segments) {
    if (!segments || !segments.length) {
      return '';
    }
    let cursor = 0;
    const stops = [];
    segments.forEach((segment) => {
      const colors = MEDAL_GRADIENTS[segment.medal] || ['#8ea6ff', '#cfe2ff'];
      const sweep = Math.max(0, Math.min(360, segment.ratio * 360));
      const end = cursor + sweep;
      const mid = cursor + sweep * 0.6;
      stops.push(`${colors[0]} ${cursor.toFixed(2)}deg`);
      stops.push(`${colors[1]} ${mid.toFixed(2)}deg`);
      stops.push(`${colors[0]} ${end.toFixed(2)}deg`);
      cursor = end;
    });
    stops.push('#e0edff 360deg');
    return `conic-gradient(${stops.join(', ')})`;
  }

  function computeAuraScore(logEntries) {
    const entries = Array.isArray(logEntries) ? logEntries.slice(-500) : [];
    const counts = MEDAL_ORDER.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});
    entries.forEach((entry) => {
      if (entry && MEDAL_WEIGHTS.hasOwnProperty(entry.medal)) {
        counts[entry.medal] += 1;
      }
    });
    const total = Object.values(counts).reduce((acc, value) => acc + value, 0);
    if (total === 0) {
      return { total: 0, score: 0, segments: [], gradient: '', hasAura: false };
    }
    const ranked = MEDAL_ORDER
      .map((medal) => ({ medal, count: counts[medal], weight: MEDAL_WEIGHTS[medal] }))
      .filter((item) => item.count > 0)
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.weight - a.weight;
      })
      .slice(0, 3);
    const subsetTotal = ranked.reduce((acc, item) => acc + item.count, 0) || 1;
    const segments = ranked.map((item) => ({
      medal: item.medal,
      ratio: item.count / subsetTotal,
      weight: item.weight
    }));
    const score = segments.reduce((acc, segment) => acc + segment.weight * segment.ratio, 0);
    const gradient = total >= 10 ? buildAuraGradient(segments) : '';
    return {
      total,
      score,
      segments,
      gradient,
      hasAura: total >= 10 && Boolean(gradient)
    };
  }

  function readAuraState() {
    const log = parseMedalLog(localStorage.getItem('medalLog'));
    return computeAuraScore(log);
  }

  function applyAuraToElement(element, aura) {
    if (!element) {
      return;
    }
    const hasAura = aura && aura.hasAura;
    if (hasAura) {
      element.classList.add('has-aura');
      element.style.setProperty('--aura-gradient', aura.gradient);
      element.dataset.aurascore = aura.score ? aura.score.toFixed(2) : '0';
    } else {
      element.classList.remove('has-aura');
      element.style.removeProperty('--aura-gradient');
      delete element.dataset.aurascore;
    }
  }

  let remoteSyncRunning = false;
  remoteStorage.setSyncHandler(() => {
    if (remoteSyncRunning) {
      return;
    }
    remoteSyncRunning = true;
    Promise.resolve()
      .then(() => updateUserSnapshot())
      .catch((err) => {
        console.warn('Falha ao sincronizar progresso automaticamente:', err);
      })
      .finally(() => {
        remoteSyncRunning = false;
      });
  });

  let cachedCurrentUser = null;
  let openLoginFlowHandler = null;
  let closeLoginFlowHandler = null;
  let closeUserMenu = null;
  let teardownUserMenu = null;

  function normalizeBalanceValue(raw) {
    if (raw === null || raw === undefined) {
      return 0;
    }
    const number = Number(raw);
    if (!Number.isFinite(number)) {
      return 0;
    }
    return Math.max(0, Math.floor(number));
  }

  function readStoredBalance() {
    return normalizeBalanceValue(localStorage.getItem(BALANCE_KEY));
  }

  function applyBalanceToUI(balance) {
    const formatted = balance.toLocaleString('pt-BR');
    const targets = document.querySelectorAll('[data-balance-value]');
    targets.forEach((element) => {
      element.textContent = formatted;
    });
  }

  function dispatchBalanceChange(balance) {
    applyBalanceToUI(balance);
    document.dispatchEvent(new CustomEvent('playtalk:balance-change', {
      detail: { balance }
    }));
  }

  function setStoredBalance(balance, { emitEvent = true } = {}) {
    const normalized = normalizeBalanceValue(balance);
    localStorage.setItem(BALANCE_KEY, String(normalized));
    if (emitEvent) {
      dispatchBalanceChange(normalized);
    } else {
      applyBalanceToUI(normalized);
    }
    return normalized;
  }

  function addToBalance(delta) {
    const normalizedDelta = normalizeBalanceValue(delta);
    if (normalizedDelta === 0) {
      const current = readStoredBalance();
      dispatchBalanceChange(current);
      return current;
    }
    const updated = readStoredBalance() + normalizedDelta;
    return setStoredBalance(updated);
  }

  function resetBalance() {
    setStoredBalance(0);
  }

  function initBalanceUI() {
    dispatchBalanceChange(readStoredBalance());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBalanceUI, { once: true });
  } else {
    initBalanceUI();
  }

  window.playtalkBalance = {
    getBalance: () => readStoredBalance(),
    add: addToBalance,
    set: (value) => setStoredBalance(value),
    reset: resetBalance
  };

  window.addEventListener('storage', (event) => {
    if (event.key === BALANCE_KEY) {
      applyBalanceToUI(normalizeBalanceValue(event.newValue));
    }
  });

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
    const options = { method, signal, headers: { ...(headers || {}) }, credentials: 'include' };

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
    remoteStorage.suspend(() => {
      for (const [key, schema] of Object.entries(PROGRESS_SCHEMA)) {
        let value = data[key];
        if (value === undefined) {
          value = getDefaultValue(schema);
        }
        if (value === undefined) {
          localStorage.removeItem(key);
        } else {
          if (key === 'playerBalance') {
            setStoredBalance(value, { emitEvent: false });
          } else {
            localStorage.setItem(key, serializeValue(value, schema));
          }
        }
      }
    });
    applyBalanceToUI(readStoredBalance());
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
    return cachedCurrentUser;
  }

  function setCurrentUser(user) {
    if (user && typeof user === 'object') {
      const normalized = {
        key: user.key,
        username: user.username || ''
      };
      if (user.data && typeof user.data === 'object') {
        try {
          normalized.data = JSON.parse(JSON.stringify(user.data));
        } catch (error) {
          console.warn('Não foi possível clonar dados do usuário atual.', error);
          normalized.data = { ...user.data };
        }
      }
      cachedCurrentUser = normalized;
    } else {
      cachedCurrentUser = null;
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

  async function logoutRequest() {
    try {
      await apiRequest('/api/users/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Falha ao encerrar sessão no servidor.', error);
    }
  }

  function dispatchUserChange() {
    const user = readStoredCurrentUser();
    document.dispatchEvent(new CustomEvent('playtalk:user-change', {
      detail: { user }
    }));
  }

  function getLevelRequirement(level) {
    const normalized = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
    return Math.round(15 * Math.pow(normalized, 1.5));
  }

  function readLevelProgress() {
    const raw = localStorage.getItem('generalProgress');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const level = Number.isFinite(parsed.level) && parsed.level > 0 ? Math.floor(parsed.level) : 1;
        const xp = Number.isFinite(parsed.xp) && parsed.xp >= 0 ? Math.floor(parsed.xp) : 0;
        return { level, xp };
      } catch (err) {
        console.warn('Não foi possível ler o progresso de nível.', err);
      }
    }
    const legacyRaw = localStorage.getItem('levelProgress');
    if (legacyRaw) {
      try {
        const parsedLegacy = JSON.parse(legacyRaw);
        const level = Number.isFinite(parsedLegacy.level) && parsedLegacy.level > 0
          ? Math.floor(parsedLegacy.level)
          : 1;
        return { level, xp: 0 };
      } catch (err) {
        console.warn('Não foi possível migrar o progresso antigo de nível.', err);
      }
    }
    return {
      level: 1,
      xp: 0
    };
  }

  function getStoredLevel() {
    const progress = readLevelProgress();
    return progress.level;
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
    const loginBtn = document.getElementById('login-btn');
    const logoutButtons = Array.from(document.querySelectorAll('[data-role="logout"]'));
    const nameEl = document.getElementById('header-username');
    const levelEl = document.getElementById('header-level');
    const avatarEl = document.getElementById('header-avatar');
    const avatarContainer = document.getElementById('header-avatar-container');
    const user = readStoredCurrentUser();
    const displayName = user
      ? (getDisplayName(user) || user.username || 'Jogador')
      : 'Visitante';
    let avatarUrl = DEFAULT_AVATAR_URL;
    const storedAvatar = localStorage.getItem('avatar');
    if (storedAvatar && storedAvatar.trim()) {
      avatarUrl = storedAvatar.trim();
    } else if (user && user.data && typeof user.data.avatar === 'string' && user.data.avatar.trim()) {
      avatarUrl = user.data.avatar.trim();
    }

    if (nameEl) {
      nameEl.textContent = displayName;
      nameEl.title = displayName;
    }
    if (levelEl) {
      levelEl.textContent = 'Nível 1';
    }

    const auraData = readAuraState();
    if (avatarContainer) {
      avatarContainer.style.setProperty('--avatar-progress', '0deg');
      avatarContainer.title = 'Nível central fixo no nível 1.';
      applyAuraToElement(avatarContainer, auraData);
    }

    if (avatarEl) {
      if (avatarEl.getAttribute('src') !== avatarUrl) {
        avatarEl.src = avatarUrl;
      }
      avatarEl.alt = `Foto de ${displayName}`;
    }

    if (loginBtn) {
      loginBtn.style.display = user ? 'none' : 'inline-flex';
    }
    logoutButtons.forEach(button => {
      const isProfilePage = Boolean(button.closest('.page-profile'));
      if (user) {
        button.disabled = false;
        button.style.display = 'inline-flex';
      } else {
        button.disabled = true;
        button.style.display = isProfilePage ? 'inline-flex' : 'none';
      }
    });
    applyBalanceToUI(readStoredBalance());
    if (!user && typeof closeUserMenu === 'function') {
      closeUserMenu();
    }
    if (user && typeof closeLoginFlowHandler === 'function') {
      closeLoginFlowHandler();
    }
  }

  function clearProgressStorage() {
    remoteStorage.suspend(() => {
      for (const key of Object.keys(PROGRESS_SCHEMA)) {
        localStorage.removeItem(key);
      }
    });
    remoteStorage.load(createDefaultData());
  }

  async function updateUserSnapshot({ useBeacon = false } = {}) {
    const user = readStoredCurrentUser();
    if (!user || !user.key) return;

    const snapshot = collectProgressFromStorage();
    const payload = {
      key: user.key,
      data: snapshot,
      username: user.username
    };

    if (useBeacon && apiSendBeacon('/api/users/update', payload)) {
      setCurrentUser({ ...user, data: { ...(user.data || {}), ...snapshot } });
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

  async function loadCurrentUserFromSession() {
    try {
      const response = await apiRequest('/api/session', { method: 'GET' });
      const user = response && response.user ? response.user : null;
      if (user) {
        const normalized = {
          key: user.key,
          username: user.username,
          data: user.data && typeof user.data === 'object' ? user.data : createDefaultData()
        };
        setCurrentUser(normalized);
        return readStoredCurrentUser();
      }
      setCurrentUser(null);
      return null;
    } catch (error) {
      console.warn('Não foi possível carregar a sessão atual:', error);
      setCurrentUser(null);
      return null;
    }
  }

  async function handleLogout() {
    await updateUserSnapshot();
    await logoutRequest();
    setCurrentUser(null);
    clearProgressStorage();
    resetBalance();
    updateAuthStatus();
    dispatchUserChange();
    const onProfilePage = document.body && document.body.classList.contains('page-profile');
    if (onProfilePage) {
      window.location.href = 'index.html';
      return;
    }
    if (typeof openLoginFlowHandler === 'function') {
      openLoginFlowHandler();
    }
  }
  async function completeLoginFlow({ username, password, confirm }) {
    if (!username || !password || !confirm) {
      throw new Error('Preencha todos os campos.');
    }
    if (password !== confirm) {
      const error = new Error('As senhas não coincidem.');
      error.step = 'password';
      throw error;
    }

    try {
      const user = await registerRequest(username, password);
      setCurrentUser(user);
      applyUserDataToStorage(user);
      updateAuthStatus();
      dispatchUserChange();
    } catch (err) {
      if (err && err.message && /existe|cadastr/i.test(err.message)) {
        try {
          const user = await loginRequest(username, password);
          setCurrentUser(user);
          applyUserDataToStorage(user);
          updateAuthStatus();
          dispatchUserChange();
          return;
        } catch (loginErr) {
          loginErr.step = 'password';
          throw loginErr;
        }
      }
      if (err) {
        err.step = err.step || 'confirm';
      }
      throw err;
    }
  }

  function setupUserMenu() {
    if (typeof teardownUserMenu === 'function') {
      teardownUserMenu();
      teardownUserMenu = null;
    }

    const container = document.querySelector('.nav-item--user');
    if (!container) {
      return;
    }

    const trigger = container.querySelector('.nav-item__trigger');
    const menu = container.querySelector('.nav-item__menu');
    if (!trigger || !menu) {
      return;
    }

    const closeMenu = () => {
      if (!container.classList.contains('nav-item--open')) {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        return;
      }
      container.classList.remove('nav-item--open');
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      container.classList.add('nav-item--open');
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    };

    const toggleMenu = event => {
      event.preventDefault();
      event.stopPropagation();
      if (container.classList.contains('nav-item--open')) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    const handleDocumentClick = event => {
      if (!container.contains(event.target)) {
        closeMenu();
      }
    };

    const handleKeydown = event => {
      if (event.key === 'Escape') {
        closeMenu();
        trigger.focus();
      }
    };

    const handleTriggerKeydown = event => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    const handleMenuClick = event => {
      event.stopPropagation();
    };

    trigger.addEventListener('click', toggleMenu);
    trigger.addEventListener('keydown', handleTriggerKeydown);
    menu.addEventListener('click', handleMenuClick);

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeydown);

    teardownUserMenu = () => {
      closeMenu();
      trigger.removeEventListener('click', toggleMenu);
      trigger.removeEventListener('keydown', handleTriggerKeydown);
      menu.removeEventListener('click', handleMenuClick);
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeydown);
      closeUserMenu = null;
      teardownUserMenu = null;
    };

    closeUserMenu = closeMenu;
    closeMenu();
  }

  function setupLoginFlow() {
    const loginBtn = document.getElementById('login-btn');
    const logoutButtons = Array.from(document.querySelectorAll('[data-role="logout"]'));
    const flow = document.getElementById('login-flow');
    const form = document.getElementById('login-flow-form');
    const errorEl = document.getElementById('login-flow-error');
    const usernameInput = document.getElementById('login-flow-username');
    const passwordInput = document.getElementById('login-flow-password');
    const confirmInput = document.getElementById('login-flow-confirm');

    logoutButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        handleLogout();
      });
    });

    if (!flow || !form || !usernameInput || !passwordInput || !confirmInput) {
      openLoginFlowHandler = null;
      closeLoginFlowHandler = null;
      return;
    }

    if (flow.classList.contains('hidden')) {
      flow.setAttribute('aria-hidden', 'true');
    }

    const steps = Array.from(form.querySelectorAll('.login-flow__step'));
    let activeStep = 'username';

    function setError(message) {
      if (errorEl) {
        errorEl.textContent = message || '';
      }
    }

    function showStep(stepName) {
      activeStep = stepName;
      steps.forEach(step => {
        step.classList.toggle('login-flow__step--active', step.dataset.step === stepName);
      });
      if (stepName === 'username') {
        usernameInput.focus();
      } else if (stepName === 'password') {
        passwordInput.focus();
      } else {
        confirmInput.focus();
      }
    }

    function resetFlow() {
      form.reset();
      setError('');
      showStep('username');
    }

    function openFlow() {
      resetFlow();
      flow.classList.remove('hidden');
      flow.setAttribute('aria-hidden', 'false');
      document.body.classList.add('login-flow-open');
    }

    function closeFlow() {
      flow.classList.add('hidden');
      flow.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('login-flow-open');
      setError('');
    }

    openLoginFlowHandler = openFlow;
    closeLoginFlowHandler = closeFlow;

    if (loginBtn) {
      loginBtn.addEventListener('click', () => openFlow());
    }

    form.querySelectorAll('.login-flow__submit[data-action="next"]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const step = button.closest('.login-flow__step');
        if (!step) return;
        const stepName = step.dataset.step;
        if (stepName === 'username') {
          const value = usernameInput.value.trim();
          if (!value) {
            setError('Informe um nome de usuário.');
            usernameInput.focus();
            return;
          }
          setError('');
          showStep('password');
        } else if (stepName === 'password') {
          const value = passwordInput.value;
          if (!value || value.length < 4) {
            setError('Informe uma senha com pelo menos 4 caracteres.');
            passwordInput.focus();
            return;
          }
          setError('');
          showStep('confirm');
        }
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      const confirm = confirmInput.value;

      try {
        await completeLoginFlow({ username, password, confirm });
        setError('');
        closeFlow();
      } catch (err) {
        console.error('Erro ao concluir fluxo de acesso:', err);
        const message = err && err.message ? err.message : 'Não foi possível concluir o acesso.';
        setError(message);
        const stepName = err && err.step ? err.step : activeStep;
        if (stepName === 'password') {
          showStep('password');
          passwordInput.select();
        } else if (stepName === 'username') {
          showStep('username');
          usernameInput.select();
        }
      }
    });

    flow.addEventListener('click', (event) => {
      if (event.target === flow && cachedCurrentUser) {
        closeFlow();
      }
    });
  }

  window.playtalkAura = {
    getLocalAura: () => readAuraState(),
    applyAura: (element, aura) => {
      applyAuraToElement(element, aura || readAuraState());
    },
    computeAura: (entries) => computeAuraScore(entries || []),
    buildGradient: (segments) => buildAuraGradient(segments),
    medalWeights: { ...MEDAL_WEIGHTS }
  };

  document.addEventListener('playtalk:aura-log-changed', () => {
    const container = document.getElementById('header-avatar-container');
    if (container) {
      applyAuraToElement(container, readAuraState());
    }
  });

  async function init() {
    const user = await loadCurrentUserFromSession();

    if (user) {
      applyUserDataToStorage(user);
    } else {
      applyUserDataToStorage(null);
    }

    updateAuthStatus();
    setupUserMenu();
    setupLoginFlow();

    window.addEventListener('beforeunload', () => {
      updateUserSnapshot({ useBeacon: true });
    });

    if (!user && typeof openLoginFlowHandler === 'function') {
      openLoginFlowHandler();
    }
  }

  function setupPageTransitions() {
    const body = document.body;
    if (!body) {
      return;
    }

    body.classList.remove('page-transition-leave');

    const navLinks = Array.from(document.querySelectorAll('#main-nav a.nav-item[data-nav-index]'))
      .sort((a, b) => {
        const aIndex = Number(a.dataset.navIndex || 0);
        const bIndex = Number(b.dataset.navIndex || 0);
        return aIndex - bIndex;
      });
    if (!navLinks.length) {
      requestAnimationFrame(() => {
        body.classList.add('page-transition-ready');
      });
      return;
    }

    const PAGE_MANIFEST = {
      'index.html': { hash: '#home', scripts: ['js/main.js'], classes: ['page-home'] },
      'fun.html': { hash: '#fun', scripts: ['js/fun-page.js'], classes: ['page-fun'] },
      'play.html': { hash: '#play', scripts: ['js/play.js'], classes: ['page-play'] },
      'custom.html': { hash: '#custom', scripts: ['js/custom-page.js'], classes: ['page-custom'] },
      'ranking.html': { hash: '#ranking', scripts: ['js/ranking.js'], classes: ['page-ranking'] },
      'perfil.html': { hash: '#perfil', scripts: ['js/profile.js'], classes: ['page-profile'] }
    };

    const transitionClasses = new Set(['page-transition-ready', 'page-transition-leave']);
    const loadedScripts = new Set();
    const pageCache = new Map();
    const parser = new DOMParser();
    const insertionAnchor = document.getElementById('login-flow') || document.querySelector('footer.page-footer');

    const resolvePathKey = (href) => {
      const url = new URL(href, window.location.href);
      const path = url.pathname.replace(/\/+$/, '');
      const segments = path.split('/').filter(Boolean);
      const last = segments.length ? segments[segments.length - 1] : 'index.html';
      return last || 'index.html';
    };

    const initialKey = resolvePathKey(window.location.href);
    const initialMain = document.querySelector('main[data-page-transition]');
    if (initialMain) {
      pageCache.set(initialKey, {
        main: initialMain,
        bodyClasses: Array.from(body.classList)
      });
    }
    const initialManifest = PAGE_MANIFEST[initialKey];
    if (initialManifest && Array.isArray(initialManifest.scripts)) {
      initialManifest.scripts.forEach(script => loadedScripts.add(script));
    }

    let currentKey = initialKey;

    const baseUrl = new URL(window.location.href);
    baseUrl.pathname = baseUrl.pathname.replace(/[^/]+$/, 'index.html');

    const setActiveNav = (pathKey) => {
      navLinks.forEach(link => {
        const linkKey = resolvePathKey(link.getAttribute('href') || '');
        const isActive = linkKey === pathKey;
        link.classList.toggle('active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    const updateBodyClasses = (nextClasses = []) => {
      const preserved = Array.from(body.classList).filter(cls => !cls.startsWith('page-') || transitionClasses.has(cls));
      body.className = '';
      preserved.forEach(cls => body.classList.add(cls));
      nextClasses.forEach(cls => {
        if (!transitionClasses.has(cls)) {
          body.classList.add(cls);
        }
      });
    };

    const ensureScripts = async (pathKey) => {
      const manifest = PAGE_MANIFEST[pathKey];
      if (!manifest || !Array.isArray(manifest.scripts)) {
        return;
      }
      for (const scriptPath of manifest.scripts) {
        if (loadedScripts.has(scriptPath)) {
          continue;
        }
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = scriptPath;
          script.async = false;
          script.onload = () => {
            loadedScripts.add(scriptPath);
            resolve();
          };
          script.onerror = () => reject(new Error(`Não foi possível carregar ${scriptPath}`));
          document.body.appendChild(script);
        });
      }
    };

    const fetchPage = async (pathKey) => {
      if (pageCache.has(pathKey)) {
        return pageCache.get(pathKey);
      }
      const response = await fetch(pathKey, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar ${pathKey} (${response.status})`);
      }
      const text = await response.text();
      const doc = parser.parseFromString(text, 'text/html');
      const main = doc.querySelector('main[data-page-transition]');
      if (!main) {
        throw new Error('Conteúdo principal não encontrado.');
      }
      const importedMain = document.importNode(main, true);
      importedMain.setAttribute('hidden', 'hidden');
      if (insertionAnchor && insertionAnchor.parentNode) {
        insertionAnchor.parentNode.insertBefore(importedMain, insertionAnchor);
      } else {
        body.appendChild(importedMain);
      }
      const entry = {
        main: importedMain,
        bodyClasses: Array.from(doc.body.classList)
      };
      pageCache.set(pathKey, entry);
      return entry;
    };

    const showPage = async (pathKey, { pushState = false } = {}) => {
      const manifest = PAGE_MANIFEST[pathKey] || null;
      try {
        const entry = await fetchPage(pathKey);
        await ensureScripts(pathKey);
        const classes = manifest && manifest.classes ? manifest.classes : entry.bodyClasses || [];
        const currentEntry = pageCache.get(currentKey);
        if (currentEntry && currentEntry.main) {
          currentEntry.main.setAttribute('hidden', 'hidden');
        }
        entry.main.removeAttribute('hidden');
        updateBodyClasses(classes);
        if (typeof window.runPlaytalkPage === 'function' && classes.length) {
          window.runPlaytalkPage(classes, { container: entry.main });
        }
        if (pathKey === 'index.html' && typeof window.goHome === 'function') {
          window.goHome();
        }
        currentKey = pathKey;
        setActiveNav(pathKey);
        if (pushState) {
          const nextUrl = new URL(baseUrl.href);
          nextUrl.hash = manifest && manifest.hash ? manifest.hash : `#${pathKey.replace(/\.html$/, '')}`;
          history.pushState({ path: pathKey }, '', nextUrl.href);
        }
      } catch (error) {
        console.error('Não foi possível trocar de página:', error);
      } finally {
        body.classList.remove('page-transition-leave');
        body.classList.add('page-transition-ready');
      }
    };

    const navigateTo = (targetPath, options = {}) => {
      const pathKey = resolvePathKey(targetPath || '');
      if (!pathKey || pathKey === currentKey) {
        return;
      }
      body.classList.add('page-transition-leave');
      showPage(pathKey, { pushState: options.pushState !== false });
    };

    navLinks.forEach(link => {
      link.addEventListener('click', event => {
        if (event.defaultPrevented) {
          return;
        }
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        if (link.target && link.target.toLowerCase() !== '_self') {
          return;
        }
        event.preventDefault();
        navigateTo(link.getAttribute('href'), { pushState: true });
      });
    });

    const getCurrentNavIndex = () => {
      const matchedIndex = navLinks.findIndex(link => resolvePathKey(link.getAttribute('href') || '') === currentKey);
      return matchedIndex === -1 ? 0 : matchedIndex;
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchActive = false;

    document.addEventListener('touchstart', event => {
      if (window.innerWidth > 720 || event.touches.length !== 1) {
        return;
      }
      touchActive = true;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', event => {
      if (!touchActive || window.innerWidth > 720) {
        touchActive = false;
        return;
      }
      touchActive = false;
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) {
        return;
      }
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const horizontalThreshold = 60;
      const verticalAllowance = 80;
      if (Math.abs(deltaX) < horizontalThreshold || Math.abs(deltaY) > verticalAllowance) {
        return;
      }
      const currentIndex = getCurrentNavIndex();
      if (currentIndex === -1) {
        return;
      }
      let targetIndex = currentIndex;
      if (deltaX < 0 && currentIndex < navLinks.length - 1) {
        targetIndex = currentIndex + 1;
      } else if (deltaX > 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
      if (targetIndex !== currentIndex) {
        navigateTo(navLinks[targetIndex].getAttribute('href'), { pushState: true });
      }
    }, { passive: true });

    window.addEventListener('popstate', event => {
      const state = event.state && event.state.path ? event.state.path : initialKey;
      navigateTo(state, { pushState: false });
    });

    const initialUrl = new URL(baseUrl.href);
    initialUrl.hash = initialManifest && initialManifest.hash ? initialManifest.hash : window.location.hash;
    history.replaceState({ path: currentKey }, '', initialUrl.href);
    setActiveNav(currentKey);

    requestAnimationFrame(() => {
      body.classList.add('page-transition-ready');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupPageTransitions();
  });

  document.addEventListener('playtalk:user-change', () => {
    updateAuthStatus();
  });

  document.addEventListener('playtalk:level-progress', event => {
    const detail = event && event.detail ? event.detail : null;
    if (detail) {
      const levelEl = document.getElementById('header-level');
      if (levelEl) {
        levelEl.textContent = 'Nível 1';
      }
      const avatarContainer = document.getElementById('header-avatar-container');
      if (avatarContainer) {
        avatarContainer.style.setProperty('--avatar-progress', '0deg');
        avatarContainer.title = 'Nível central fixo no nível 1.';
      }
    } else {
      updateAuthStatus();
    }
  });

  window.addEventListener('storage', (event) => {
    if (!event) {
      return;
    }

    const watchedKeys = ['generalProgress', 'modeProgress', 'displayName', 'avatar'];
    if (event.key && watchedKeys.includes(event.key)) {
      updateAuthStatus();
      return;
    }

    if (event.key === null) {
      updateAuthStatus();
    }
  });

  window.playtalkAuth = {
    getCurrentUser: () => readStoredCurrentUser(),
    persistProgress: () => updateUserSnapshot(),
    applyUserData: applyUserDataToStorage,
    createDefaultData,
    openLoginFlow: () => {
      if (typeof openLoginFlowHandler === 'function') {
        openLoginFlowHandler();
      }
    }
  };
})();
