(function(global) {
  if (!global || !global.localStorage) {
    return;
  }

  const PROGRESS_KEYS = new Set([
    'acertosTotais',
    'errosTotais',
    'tentativasTotais',
    'points',
    'playerBalance',
    'displayName',
    'modeStats',
    'completedModes',
    'unlockedModes',
    'modeIntroShown',
    'playtalkSettings',
    'generalProgress',
    'modeProgress',
    'pastaAtual',
    'tutorialDone',
    'ilifeDone',
    'levelDetails',
    'totalTime',
    'shareResults',
    'avatar',
    'medalHistory',
    'currentStreak',
    'bestStreak',
    'monthlyStats',
    'recentPhraseStats'
  ]);

  const memoryStore = new Map();
  const original = {
    getItem: global.localStorage.getItem.bind(global.localStorage),
    setItem: global.localStorage.setItem.bind(global.localStorage),
    removeItem: global.localStorage.removeItem.bind(global.localStorage),
    clear: global.localStorage.clear.bind(global.localStorage)
  };

  let syncTimeout = null;

  function scheduleServerSync() {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    syncTimeout = global.setTimeout(() => {
      syncTimeout = null;
      try {
        if (global.playtalkAuth && typeof global.playtalkAuth.persistProgress === 'function') {
          global.playtalkAuth.persistProgress();
        }
      } catch (error) {
        console.warn('Não foi possível sincronizar o progresso com o servidor.', error);
      }
    }, 400);
  }

  function emitChange(key, newValue, oldValue) {
    try {
      const event = new CustomEvent('playtalk:storage-change', {
        detail: { key, newValue, oldValue }
      });
      global.dispatchEvent(event);
    } catch (error) {
      console.warn('Falha ao propagar mudança de progresso.', error);
    }
  }

  function importExistingProgress() {
    PROGRESS_KEYS.forEach((key) => {
      const raw = original.getItem(key);
      if (raw !== null && raw !== undefined) {
        memoryStore.set(key, String(raw));
        try {
          original.removeItem(key);
        } catch (error) {
          console.warn('Não foi possível limpar dado local de progresso:', key, error);
        }
      }
    });
  }

  function getProgressValue(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  }

  function setProgressValue(key, value) {
    const stringValue = value === undefined || value === null ? null : String(value);
    const previous = getProgressValue(key);
    if (stringValue === null) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, stringValue);
    }
    if (previous !== stringValue) {
      emitChange(key, stringValue, previous);
      scheduleServerSync();
    }
  }

  function removeProgressValue(key) {
    if (!memoryStore.has(key)) {
      return;
    }
    const previous = memoryStore.get(key);
    memoryStore.delete(key);
    emitChange(key, null, previous);
    scheduleServerSync();
  }

  importExistingProgress();

  global.playtalkProgressStore = {
    get: (key) => getProgressValue(String(key)),
    set: (key, value) => setProgressValue(String(key), value),
    remove: (key) => removeProgressValue(String(key)),
    keys: () => Array.from(memoryStore.keys())
  };

  global.localStorage.getItem = function patchedGetItem(key) {
    const normalized = String(key);
    if (PROGRESS_KEYS.has(normalized)) {
      return getProgressValue(normalized);
    }
    return original.getItem(normalized);
  };

  global.localStorage.setItem = function patchedSetItem(key, value) {
    const normalized = String(key);
    if (PROGRESS_KEYS.has(normalized)) {
      setProgressValue(normalized, value);
      return value;
    }
    return original.setItem(normalized, value);
  };

  global.localStorage.removeItem = function patchedRemoveItem(key) {
    const normalized = String(key);
    if (PROGRESS_KEYS.has(normalized)) {
      removeProgressValue(normalized);
      return;
    }
    return original.removeItem(normalized);
  };

  global.localStorage.clear = function patchedClear() {
    const progressKeys = new Set(memoryStore.keys());
    original.clear();
    progressKeys.forEach((key) => {
      const value = memoryStore.get(key);
      if (value !== undefined && value !== null) {
        memoryStore.set(key, value);
      }
    });
  };
})(typeof window !== 'undefined' ? window : null);
