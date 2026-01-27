(() => {
  let initialized = false;

  const initProfilePage = () => {
    if (initialized) return;
    initialized = true;
    const STATS_STORAGE_KEY = 'playtalk-flashcard-stats';

        const totalSpeakingsEl = document.getElementById('totalSpeakings');
        const totalListeningsEl = document.getElementById('totalListenings');
        const avgListeningEl = document.getElementById('avgListening');
        const avgReadingEl = document.getElementById('avgReading');
        const avgAssociationEl = document.getElementById('avgAssociation');
        const avgMeaningEl = document.getElementById('avgMeaning');
        const emptyState = document.getElementById('emptyState');

        function loadStats() {
          try {
            const raw = localStorage.getItem(STATS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
          } catch (error) {
            return {};
          }
        }

        function normalizeCount(entry, key, fallbackKey) {
          if (!entry) return 0;
          if (typeof entry[key] === 'number') return entry[key];
          if (fallbackKey && Array.isArray(entry[fallbackKey])) return entry[fallbackKey].length;
          return 0;
        }

        function accumulateMetric(entry, key, totals, counts) {
          if (!entry || !Array.isArray(entry[key])) return;
          entry[key].forEach(value => {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return;
            totals[key] += numeric;
            counts[key] += 1;
          });
        }

        function formatAverage(total, count) {
          if (!count) return '--';
          return `${Math.round(total / count)}%`;
        }

        function renderStats() {
          const stats = loadStats();
          const entries = Object.values(stats);
          const totals = {
            listening: 0,
            reading: 0,
            association: 0,
            meaning: 0
          };
          const counts = {
            listening: 0,
            reading: 0,
            association: 0,
            meaning: 0
          };
          let totalSpeakings = 0;
          let totalListenings = 0;

          entries.forEach(entry => {
            totalSpeakings += normalizeCount(entry, 'spokenCount', 'pronunciation');
            totalListenings += normalizeCount(entry, 'listenedCount');
            accumulateMetric(entry, 'listening', totals, counts);
            accumulateMetric(entry, 'reading', totals, counts);
            accumulateMetric(entry, 'association', totals, counts);
            accumulateMetric(entry, 'meaning', totals, counts);
          });

          totalSpeakingsEl.textContent = `${totalSpeakings}`;
          totalListeningsEl.textContent = `${totalListenings}`;
          avgListeningEl.textContent = formatAverage(totals.listening, counts.listening);
          avgReadingEl.textContent = formatAverage(totals.reading, counts.reading);
          avgAssociationEl.textContent = formatAverage(totals.association, counts.association);
          avgMeaningEl.textContent = formatAverage(totals.meaning, counts.meaning);

          const hasData = entries.length && (totalSpeakings || totalListenings || counts.listening || counts.reading || counts.association || counts.meaning);
          emptyState.hidden = Boolean(hasData);
        }

        renderStats();
  };

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-profile', initProfilePage);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfilePage, { once: true });
  } else {
    initProfilePage();
  }
})();
