(function () {
  const PROGRESS_SCHEMA = {
    acertosTotais: 'number',
    errosTotais: 'number',
    tentativasTotais: 'number',
    points: 'number',
    completedModes: 'json',
    unlockedModes: 'json',
    modeIntroShown: 'json',
    modeStats: 'json',
    tutorialDone: 'boolean',
    ilifeDone: 'boolean',
    levelDetails: 'json',
    totalTime: 'number',
    pastaAtual: 'number',
  };

  const PROGRESS_KEYS = Object.keys(PROGRESS_SCHEMA);
  window.playtalkProgressKeyList = PROGRESS_KEYS.slice();

  let saveTimeout = null;
  let lastProgressPayload = null;

  function scheduleProgressSave() {
    if (!window.playtalkSession?.authenticated) {
      return;
    }
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(flushProgress, 1000);
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function patchedSetItem(key, value) {
    originalSetItem(key, value);
    if (window.playtalkProgressKeyList?.includes(key)) {
      scheduleProgressSave();
    }
  };

  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = function patchedRemoveItem(key) {
    originalRemoveItem(key);
    if (window.playtalkProgressKeyList?.includes(key)) {
      scheduleProgressSave();
    }
  };

  function readNumber(key) {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : 0;
  }

  function readBoolean(key) {
    return localStorage.getItem(key) === 'true';
  }

  function readJSON(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error(`Erro ao analisar o valor salvo para ${key}:`, error);
      return fallback;
    }
  }

  function serializeValue(key, value) {
    switch (PROGRESS_SCHEMA[key]) {
      case 'number':
        return typeof value === 'number' && Number.isFinite(value)
          ? String(value)
          : null;
      case 'boolean':
        return value ? 'true' : 'false';
      case 'json':
        return JSON.stringify(value ?? (Array.isArray(value) ? [] : value || {}));
      default:
        return null;
    }
  }

  function applyProgress(progress) {
    if (!progress || typeof progress !== 'object') {
      return;
    }

    PROGRESS_KEYS.forEach((key) => {
      if (!(key in progress)) {
        return;
      }
      const serialized = serializeValue(key, progress[key]);
      if (serialized === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, serialized);
      }
    });
  }

  function collectProgress() {
    return {
      acertosTotais: readNumber('acertosTotais'),
      errosTotais: readNumber('errosTotais'),
      tentativasTotais: readNumber('tentativasTotais'),
      points: readNumber('points'),
      completedModes: readJSON('completedModes', {}),
      unlockedModes: readJSON('unlockedModes', {}),
      modeIntroShown: readJSON('modeIntroShown', {}),
      modeStats: readJSON('modeStats', {}),
      tutorialDone: readBoolean('tutorialDone'),
      ilifeDone: readBoolean('ilifeDone'),
      levelDetails: readJSON('levelDetails', []),
      totalTime: readNumber('totalTime'),
      pastaAtual: readNumber('pastaAtual'),
    };
  }

  async function flushProgress() {
    if (!window.playtalkSession?.authenticated) {
      return;
    }

    const payload = collectProgress();
    if (lastProgressPayload && JSON.stringify(lastProgressPayload) === JSON.stringify(payload)) {
      return;
    }

    lastProgressPayload = payload;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ progress: payload }),
      });
    } catch (error) {
      console.error('Erro ao salvar progresso do usuário:', error);
    }

    saveTimeout = null;
  }

  window.playtalkScheduleProgressSave = scheduleProgressSave;

  window.addEventListener('beforeunload', () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      flushProgress();
    }
  });

  async function fetchSession() {
    try {
      const response = await fetch('/api/session', {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error('Falha ao obter sessão.');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      return { authenticated: false };
    }
  }

  async function syncProgressFromServer() {
    try {
      const response = await fetch('/api/progress', {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error('Falha ao obter progresso.');
      }
      const data = await response.json();
      if (data && typeof data.progress === 'object') {
        applyProgress(data.progress);
        lastProgressPayload = collectProgress();
      }
    } catch (error) {
      console.error('Erro ao carregar progresso do usuário:', error);
    }
  }

  function loadMainScript() {
    const script = document.createElement('script');
    script.src = 'js/main.js';
    script.defer = false;
    document.body.appendChild(script);
  }

  (async function init() {
    const session = await fetchSession();
    window.playtalkSession = session;
    window.dispatchEvent(new CustomEvent('playtalk:session', { detail: session }));

    if (session.authenticated) {
      await syncProgressFromServer();
    }

    loadMainScript();
  })();
})();
