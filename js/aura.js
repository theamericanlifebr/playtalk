(function() {
  const MAX_HISTORY = 500;
  const MEDAL_ORDER = ['diamante', 'ouro', 'prata', 'bronze', 'chumbo', 'gesso'];
  const MEDAL_VALUES = {
    diamante: 12,
    ouro: 8,
    prata: 4,
    bronze: 2,
    chumbo: 1,
    gesso: 0
  };
  const MEDAL_COLORS = {
    diamante: ['#8fd3ff', '#cbe9ff'],
    ouro: ['#f5c242', '#ffe98f'],
    prata: ['#cfd8e2', '#f8f9fb'],
    bronze: ['#b0793c', '#f1c179'],
    chumbo: ['#5f6773', '#818892'],
    gesso: ['#9a7a58', '#d9c4a9']
  };

  function normalizeHistory(history) {
    if (!Array.isArray(history)) {
      return [];
    }
    return history
      .map(entry => {
        if (typeof entry === 'string') {
          return { type: entry.trim().toLowerCase(), earnedAt: null };
        }
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        return {
          type: String(entry.type || entry.medal || '').trim().toLowerCase(),
          earnedAt: entry.earnedAt || entry.date || null
        };
      })
      .filter(Boolean)
      .filter(entry => MEDAL_ORDER.includes(entry.type))
      .slice(-MAX_HISTORY);
  }

  function buildSegments(history) {
    const normalized = normalizeHistory(history);
    if (!normalized.length) {
      return { segments: [], score: 0, total: 0 };
    }
    const counts = new Map();
    normalized.forEach(entry => {
      counts.set(entry.type, (counts.get(entry.type) || 0) + 1);
    });
    const ranked = Array.from(counts.entries())
      .map(([type, count]) => ({ type, count, value: MEDAL_VALUES[type] || 0 }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return (b.value || 0) - (a.value || 0);
      })
      .slice(0, 3);
    const total = ranked.reduce((sum, entry) => sum + entry.count, 0);
    if (!total) {
      return { segments: [], score: 0, total: 0 };
    }
    const segments = ranked.map(entry => ({
      type: entry.type,
      percent: (entry.count / total) * 100,
      colorStops: MEDAL_COLORS[entry.type] || ['#c5d7ff', '#7fa8ff'],
      value: entry.value
    }));
    const score = segments.reduce((sum, seg) => sum + (seg.value * (seg.percent / 100)), 0);
    return { segments, score, total: normalized.length };
  }

  function buildGradient(segments) {
    if (!segments || !segments.length) {
      return 'conic-gradient(#c5d7ff, #7fa8ff)';
    }
    let current = 0;
    const parts = segments.map(segment => {
      const start = current;
      const end = current + segment.percent;
      current = end;
      const [from, to] = segment.colorStops;
      return `${from} ${start.toFixed(2)}%, ${to} ${end.toFixed(2)}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }

  window.playtalkAura = {
    MAX_HISTORY,
    MEDAL_ORDER,
    MEDAL_VALUES,
    MEDAL_COLORS,
    compute(history) {
      return buildSegments(history);
    },
    gradientFor(history) {
      const { segments } = buildSegments(history);
      return buildGradient(segments);
    },
    gradientFromSegments(segments) {
      return buildGradient(segments);
    }
  };
})();
