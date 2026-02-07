(function() {
  const DEFAULT_BASE = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/gamesounds';

  function normalizeBaseUrl(value) {
    if (typeof value !== 'string') return DEFAULT_BASE;
    const trimmed = value.trim();
    if (!trimmed) return DEFAULT_BASE;
    return trimmed.replace(/\/+$/, '');
  }

  function stripPrefix(path) {
    if (!path) return '';
    const cleaned = path.trim();
    if (!cleaned) return '';
    if (
      cleaned.startsWith('http://') ||
      cleaned.startsWith('https://') ||
      cleaned.startsWith('data:') ||
      cleaned.startsWith('blob:')
    ) {
      return cleaned;
    }
    return cleaned.replace(/^gamesounds\//, '').replace(/^\/+/, '');
  }

  function resolveGameSoundUrl(path) {
    const cleaned = stripPrefix(path);
    if (!cleaned) return '';
    if (
      cleaned.startsWith('http://') ||
      cleaned.startsWith('https://') ||
      cleaned.startsWith('data:') ||
      cleaned.startsWith('blob:')
    ) {
      return cleaned;
    }
    const base = normalizeBaseUrl(window.GAME_SOUNDS_BASE_URL);
    return `${base}/${cleaned}`;
  }

  window.getGameSoundUrl = resolveGameSoundUrl;

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('audio[src^="gamesounds/"]').forEach(audio => {
      const src = audio.getAttribute('src');
      const resolved = resolveGameSoundUrl(src);
      if (resolved) {
        audio.src = resolved;
      }
    });
  });
})();
