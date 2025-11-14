(function(global) {
  if (!global) {
    return;
  }

  const STORAGE_EVENT = 'playtalk-storage';
  const memoryStore = new Map();

  function normalizeKey(key) {
    if (key === undefined || key === null) {
      return '';
    }
    return String(key);
  }

  function toValue(value) {
    if (value === undefined || value === null) {
      return null;
    }
    return String(value);
  }

  function emitChange(key, newValue, oldValue) {
    try {
      global.dispatchEvent(new CustomEvent(STORAGE_EVENT, {
        detail: { key, newValue, oldValue }
      }));
    } catch (error) {
      console.warn('Não foi possível emitir evento de armazenamento:', error);
    }
  }

  function isLocalStorageAvailable() {
    try {
      if (!('localStorage' in global)) {
        return false;
      }
      const testKey = '__playtalk_storage_test__';
      global.localStorage.setItem(testKey, '1');
      global.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  const nativeStorage = isLocalStorageAvailable() ? global.localStorage : null;

  function getEntries() {
    if (nativeStorage) {
      const entries = [];
      for (let i = 0; i < nativeStorage.length; i += 1) {
        const key = nativeStorage.key(i);
        if (key !== null && key !== undefined) {
          entries.push([key, nativeStorage.getItem(key)]);
        }
      }
      return entries;
    }
    return Array.from(memoryStore.entries());
  }

  const storage = {
    get length() {
      return nativeStorage ? nativeStorage.length : memoryStore.size;
    },
    key(index) {
      if (!Number.isFinite(index) || index < 0) {
        return null;
      }
      if (nativeStorage) {
        return nativeStorage.key(index);
      }
      return Array.from(memoryStore.keys())[index] || null;
    },
    getItem(key) {
      const normalized = normalizeKey(key);
      if (nativeStorage) {
        const value = nativeStorage.getItem(normalized);
        return value === null ? null : value;
      }
      return memoryStore.has(normalized) ? memoryStore.get(normalized) : null;
    },
    setItem(key, value) {
      const normalized = normalizeKey(key);
      const newValue = toValue(value);
      const oldValue = this.getItem(normalized);
      if (nativeStorage) {
        nativeStorage.setItem(normalized, newValue);
      } else {
        memoryStore.set(normalized, newValue);
      }
      emitChange(normalized, newValue, oldValue);
    },
    removeItem(key) {
      const normalized = normalizeKey(key);
      const oldValue = this.getItem(normalized);
      if (oldValue === null) {
        return;
      }
      if (nativeStorage) {
        nativeStorage.removeItem(normalized);
      } else {
        memoryStore.delete(normalized);
      }
      emitChange(normalized, null, oldValue);
    },
    clear() {
      const entries = getEntries();
      if (!entries.length) {
        return;
      }
      if (nativeStorage) {
        nativeStorage.clear();
      } else {
        memoryStore.clear();
      }
      entries.forEach(([key, value]) => emitChange(key, null, value));
    }
  };

  function importSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }
    Object.entries(snapshot).forEach(([key, value]) => {
      storage.setItem(key, value);
    });
  }

  function exportSnapshot() {
    const payload = {};
    getEntries().forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        payload[key] = value;
      }
    });
    return payload;
  }

  global.playtalkStorage = storage;
  global.playtalkStorageSync = {
    import: importSnapshot,
    export: exportSnapshot,
    reset: () => storage.clear(),
    eventName: STORAGE_EVENT
  };
})(typeof window !== 'undefined' ? window : null);
