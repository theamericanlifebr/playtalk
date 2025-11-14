(function() {
  const store = new Map();
  const STORAGE_EVENT = 'playtalk-storage';

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
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, {
      detail: { key, newValue, oldValue }
    }));
  }

  const storage = {
    get length() {
      return store.size;
    },
    key(index) {
      if (!Number.isFinite(index) || index < 0 || index >= store.size) {
        return null;
      }
      return Array.from(store.keys())[index];
    },
    getItem(key) {
      const normalized = normalizeKey(key);
      return store.has(normalized) ? store.get(normalized) : null;
    },
    setItem(key, value) {
      const normalized = normalizeKey(key);
      const newValue = toValue(value);
      const oldValue = store.has(normalized) ? store.get(normalized) : null;
      store.set(normalized, newValue);
      emitChange(normalized, newValue, oldValue);
    },
    removeItem(key) {
      const normalized = normalizeKey(key);
      if (!store.has(normalized)) {
        return;
      }
      const oldValue = store.get(normalized);
      store.delete(normalized);
      emitChange(normalized, null, oldValue);
    },
    clear() {
      if (!store.size) {
        return;
      }
      const entries = Array.from(store.entries());
      store.clear();
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
    store.forEach((value, key) => {
      if (value !== null && value !== undefined) {
        payload[key] = value;
      }
    });
    return payload;
  }

  window.playtalkStorage = storage;
  window.playtalkStorageSync = {
    import: importSnapshot,
    export: exportSnapshot,
    reset: () => storage.clear(),
    eventName: STORAGE_EVENT
  };
})();
