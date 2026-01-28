(() => {
  let initialized = false;

  const initFunPage = () => {
    if (initialized) return;
    initialized = true;
    const FLASHCARD_STATS_STORAGE_KEY = 'playtalk-flashcard-stats';
        const FLASHCARD_PRONUNCIATION_LIMIT = 6;
        const FLASHCARD_METRIC_LIMIT = 10;
        const FLASHCARD_TIME_LIMIT = 10;
        const MEMORY_HISTORY_LIMIT = 10;
        const MEMORY_SEEDING_DAYS = [3, 7, 15, 30];
        const MEMORY_SEEDING_HOLD_DELAY_MS = 10000;
        const MEMORY_SEEDING_HOLD_DECREASE_HOURS = 2;
        const MEMORY_STAR_COUNT = 6;
        const MEMORY_BACKGROUND_IMAGES = {
          0: 'images/galaxy.png',
          1: 'images/gold.png',
          2: 'images/diamond.png',
          3: 'images/mind.png',
          4: 'images/connect.png'
        };
        const MEMORY_SEEDING_BACKGROUND = 'images/seeding.png';
        const MEMORY_LENS_SEEDED_COLOR = '28, 94, 50';
        const MEMORY_LENS_MASTERED_COLOR = '0, 0, 0';
        const MEMORY_STAGE_OPTIONS = [
          { label: 'Branco', stage: 0, image: 'images/galaxy.png' },
          { label: 'Prata', stage: 1, image: 'images/gold.png' },
          { label: 'Platina', stage: 2, image: 'images/diamond.png' },
          { label: 'Ouro', stage: 3, image: 'images/mind.png' },
          { label: 'Diamante', stage: 4, image: 'images/connect.png' }
        ];
        const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.opus', '.ogg', '.webm'];
        const MIRROR_PATH = 'data/mirror.json';
        const SEEDING_TIMER_ICON = `
          <svg class="seeding-timer__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 7a1 1 0 0 1 1 1v4.59l2.3 2.3a1 1 0 1 1-1.4 1.42l-2.6-2.6A1 1 0 0 1 11 13V8a1 1 0 0 1 1-1Zm0-5a9.5 9.5 0 1 1-9.5 9.5A9.5 9.5 0 0 1 12 2Zm0 2a7.5 7.5 0 1 0 7.5 7.5A7.5 7.5 0 0 0 12 4Z"/>
          </svg>
        `;

        const flashcardGrid = document.getElementById('flashcardGrid');
        const levelFilter = document.getElementById('levelFilter');
        const detailPronuncia = document.getElementById('detailPronuncia');
        const detailPronunciaCard = document.getElementById('detailPronunciaCard');
        const detailSpeakings = document.getElementById('detailSpeakings');
        const detailListenings = document.getElementById('detailListenings');
        const detailListening = document.getElementById('detailListening');
        const detailReading = document.getElementById('detailReading');
        const detailAssociation = document.getElementById('detailAssociation');
        const detailMeaning = document.getElementById('detailMeaning');
        const detailJogado = document.getElementById('detailJogado');
        const detailFalado = document.getElementById('detailFalado');
        const detailOuvido = document.getElementById('detailOuvido');
        const detailImage = document.getElementById('detailImage');
        const detailPhrase = document.getElementById('detailPhrase');
        const emptyState = document.getElementById('emptyState');
        const editModal = document.getElementById('editModal');
        const editImage = document.getElementById('editImage');
        const editPortuguese = document.getElementById('editPortuguese');
        const editEnglish = document.getElementById('editEnglish');
        const editCategory = document.getElementById('editCategory');
        const editState = document.getElementById('editState');
        const cancelEdit = document.getElementById('cancelEdit');
        const saveEdit = document.getElementById('saveEdit');
        const gameModeModal = document.getElementById('gameModeModal');
        const closeGameMode = document.getElementById('closeGameMode');
        const detailModal = document.getElementById('detailModal');
        const detailPanel = document.getElementById('detailPanel');
        const detailClose = document.getElementById('detailClose');
        const openMemoryGame = document.getElementById('openMemoryGame');
        const seedStageModal = document.getElementById('seedStageModal');
        const seedStageGrid = document.getElementById('seedStageGrid');
        const closeSeedStage = document.getElementById('closeSeedStage');

        let flashcards = [];
        let selectedCardId = null;
        let audioInstance = null;
        let audioClickCount = 0;
        let recognition = null;
        let mirrorGroups = [];
        let micPermissionPromise = null;
        let phraseIntervals = [];
        let detailPhraseInterval = null;
        let detailPressTimer = null;
        let detailLongPressTriggered = false;
        let cardSeedingHoldTimer = null;
        let cardSeedingHoldInterval = null;
        let stageTargetCard = null;
        const accuracyColorCache = new Map();
        let flashcardStats = loadFlashcardStats();

        ['copy', 'cut', 'contextmenu', 'dragstart'].forEach(eventName => {
          document.addEventListener(eventName, event => {
            event.preventDefault();
          });
        });

        const TENSE_STYLES = {
          '': {
            ring: 'conic-gradient(#8dc9ff, #8dc9ff)'
          },
          'present-simple': {
            ring: 'conic-gradient(#8dc9ff, #8dc9ff)'
          },
          'present-continuous': {
            ring: 'conic-gradient(#8dc9ff, #cfeaff, #8dc9ff)',
            animation: 'spin 3s linear infinite'
          },
          'present-perfect': {
            ring: 'conic-gradient(#8dc9ff, #c2b15a, #f2c14f, #8dc9ff)'
          },
          'present-perfect-continuous': {
            ring: 'conic-gradient(#8dc9ff, #cfeaff, #f78c1f, #8dc9ff)',
            animation: 'spin 1s linear infinite'
          },
          'past-simple': {
            ring: 'conic-gradient(#8d939e, #8d939e)',
            filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) grayscale(1)'
          },
          'past-continuous': {
            ring: 'conic-gradient(#8d939e, #1b1b1b, #8d939e)',
            animation: 'spin 3s linear infinite',
            filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) grayscale(1)'
          },
          'past-perfect': {
            ring: 'conic-gradient(#8d939e, #1b1b1b, #f2c14f, #8d939e)',
            filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) grayscale(1)'
          },
          'past-perfect-continuous': {
            ring: 'conic-gradient(#8d939e, #6f7480, #f78c1f, #8d939e)',
            animation: 'spin 1s linear infinite',
            filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) grayscale(1)'
          },
          'future-simple': {
            ring: 'conic-gradient(#172c6b, #172c6b)'
          },
          'future-continuous': {
            ring: 'conic-gradient(#172c6b, #0a0a0a, #172c6b)',
            animation: 'spin 3s linear infinite'
          },
          'future-perfect': {
            ring: 'conic-gradient(#172c6b, #0a0a0a, #f2c14f, #172c6b)'
          },
          'future-perfect-continuous': {
            ring: 'conic-gradient(#172c6b, #0a0a0a, #f78c1f, #172c6b)',
            animation: 'spin 1s linear infinite'
          },
          'going-to-future': {
            ring: 'conic-gradient(#172c6b, #172c6b)'
          },
          'present-continuous-future': {
            ring: 'conic-gradient(#172c6b, #172c6b)'
          },
          'present-simple-future': {
            ring: 'conic-gradient(#172c6b, #172c6b)'
          },
          'conditional-would': {
            lens: 'linear-gradient(40deg, rgba(90, 150, 255, 0.75) 0%, rgba(90, 150, 255, 0) 60%)'
          }
        };

        const SENTENCE_FORM_STYLES = {
          affirmative: {
            lens: 'linear-gradient(to top, rgba(41, 214, 123, 0.75) 0%, rgba(41, 214, 123, 0) 60%)'
          },
          negative: {
            lens: 'linear-gradient(to top, rgba(255, 77, 79, 0.75) 0%, rgba(255, 77, 79, 0) 60%)'
          },
          question: {
            lens: 'linear-gradient(to top, rgba(246, 178, 94, 0.75) 0%, rgba(246, 178, 94, 0) 60%)'
          },
          imperative: {
            lens: 'linear-gradient(to top, rgba(246, 196, 83, 0.75) 0%, rgba(246, 196, 83, 0) 60%)'
          }
        };

        function loadFlashcardStats() {
          try {
            const stored = localStorage.getItem(FLASHCARD_STATS_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
          } catch (error) {
            return {};
          }
        }

        function saveFlashcardStats(stats) {
          localStorage.setItem(FLASHCARD_STATS_STORAGE_KEY, JSON.stringify(stats));
          flashcardStats = stats;
        }

        function normalizeSpeechText(text) {
          return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9' ]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        function escapeRegExp(value) {
          return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function applyMirrorGroups(text) {
          if (!mirrorGroups.length || !text) return text;
          let result = text;
          mirrorGroups.forEach(group => {
            const { canonical, variants } = group;
            variants.forEach(variant => {
              if (!variant || variant === canonical) return;
              const escaped = escapeRegExp(variant);
              const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'g');
              result = result.replace(regex, `$1${canonical}`);
            });
          });
          return result;
        }

        function longestCommonSubstringLength(a, b) {
          if (!a || !b) return 0;
          const aLen = a.length;
          const bLen = b.length;
          const dp = Array.from({ length: aLen + 1 }, () => Array(bLen + 1).fill(0));
          let maxLen = 0;
          for (let i = 1; i <= aLen; i += 1) {
            for (let j = 1; j <= bLen; j += 1) {
              if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                if (dp[i][j] > maxLen) maxLen = dp[i][j];
              }
            }
          }
          return maxLen;
        }

        function calculateSequenceMatchPercent(expected, spoken) {
          const normalizedExpected = applyMirrorGroups(normalizeSpeechText(expected));
          const normalizedSpoken = applyMirrorGroups(normalizeSpeechText(spoken));
          if (!normalizedExpected) return 0;
          const longestMatch = longestCommonSubstringLength(normalizedExpected, normalizedSpoken);
          return (longestMatch / normalizedExpected.length) * 100;
        }

        function normalizeMirrorGroups(data) {
          if (!data || typeof data !== 'object') return [];
          return Object.entries(data).map(([canonical, variants]) => {
            const normalizedCanonical = normalizeSpeechText(canonical);
            const normalizedVariants = Array.isArray(variants) ? variants : [];
            const normalizedList = [normalizedCanonical, ...normalizedVariants.map(normalizeSpeechText)]
              .filter(Boolean);
            const unique = Array.from(new Set(normalizedList));
            unique.sort((a, b) => b.length - a.length);
            return {
              canonical: normalizedCanonical,
              variants: unique
            };
          }).filter(group => group.canonical);
        }

        async function loadMirrorGroups() {
          try {
            const response = await fetch(MIRROR_PATH);
            if (!response.ok) {
              mirrorGroups = [];
              return;
            }
            const data = await response.json();
            mirrorGroups = normalizeMirrorGroups(data);
          } catch (error) {
            mirrorGroups = [];
          }
        }

        function getFlashcardKey(card) {
          if (!card) return '';
          const normalizedText = normalizeSpeechText(card.nomeIngles || card.en || '');
          if (normalizedText) return normalizedText;
          return String(card.file || '').trim().toLowerCase();
        }

        function ensureStatsEntry(stats, key) {
          if (!stats[key]) {
            stats[key] = {
              pronunciation: [],
              listening: [],
              reading: [],
              association: [],
              meaning: [],
              durations: [],
              lastPlayedAt: null,
              lastSpokenAt: null,
              lastHeardAt: null,
              spokenCount: 0,
              listenedCount: 0,
              memoryHistory: [],
              memoryStreak: 0,
              memoryStage: 0,
              memorySeedingUntil: null,
              memoryMastered: false
            };
          }
          if (typeof stats[key].spokenCount !== 'number') {
            stats[key].spokenCount = Array.isArray(stats[key].pronunciation)
              ? stats[key].pronunciation.length
              : 0;
          }
          if (typeof stats[key].listenedCount !== 'number') {
            stats[key].listenedCount = 0;
          }
          if (!Array.isArray(stats[key].listening)) {
            stats[key].listening = [];
          }
          if (!Array.isArray(stats[key].reading)) {
            stats[key].reading = [];
          }
          if (!Array.isArray(stats[key].association)) {
            stats[key].association = [];
          }
          if (!Array.isArray(stats[key].meaning)) {
            stats[key].meaning = [];
          }
          if (!Array.isArray(stats[key].memoryHistory)) {
            stats[key].memoryHistory = [];
          }
          if (typeof stats[key].memoryStreak !== 'number') {
            stats[key].memoryStreak = 0;
          }
          if (typeof stats[key].memoryStage !== 'number') {
            stats[key].memoryStage = 0;
          }
          if (typeof stats[key].memorySeedingUntil !== 'number') {
            stats[key].memorySeedingUntil = null;
          }
          if (typeof stats[key].memoryMastered !== 'boolean') {
            stats[key].memoryMastered = false;
          }
          return stats[key];
        }

        function pushLimited(list, value, limit) {
          if (!Array.isArray(list)) return;
          list.push(value);
          while (list.length > limit) {
            list.shift();
          }
        }

        function syncMemoryState(entry) {
          if (!entry) return false;
          let changed = false;
          const now = Date.now();
          if (entry.memorySeedingUntil && now >= entry.memorySeedingUntil) {
            entry.memorySeedingUntil = null;
            entry.memoryStreak = 0;
            if (entry.memoryStage < 4) {
              entry.memoryStage += 1;
            }
            changed = true;
          }
          if (entry.memoryMastered) {
            if (entry.memoryStage !== 4) {
              entry.memoryStage = 4;
              changed = true;
            }
          }
          return changed;
        }

        function isMemorySeeding(entry) {
          return Boolean(entry?.memorySeedingUntil && Date.now() < entry.memorySeedingUntil);
        }

        function getMemoryBackground(entry) {
          if (isMemorySeeding(entry)) {
            return MEMORY_SEEDING_BACKGROUND;
          }
          const stage = entry?.memoryStage ?? 0;
          return MEMORY_BACKGROUND_IMAGES[stage] || MEMORY_BACKGROUND_IMAGES[0];
        }

        function getMemoryStreakValue(entry) {
          if (!entry) return 0;
          if (entry.memoryMastered) return MEMORY_STAR_COUNT;
          if (isMemorySeeding(entry)) return MEMORY_STAR_COUNT;
          return Math.max(0, Math.min(MEMORY_STAR_COUNT, Number(entry.memoryStreak) || 0));
        }

        function formatRemainingSeeding(entry) {
          if (!entry || !entry.memorySeedingUntil) return '';
          const diffMs = entry.memorySeedingUntil - Date.now();
          if (diffMs <= 0) return '0 dias 0 horas';
          const totalHours = Math.max(1, Math.ceil(diffMs / 3600000));
          const diffDays = Math.floor(totalHours / 24);
          const diffHours = totalHours % 24;
          return `${diffDays} dias ${diffHours} horas`;
        }

        function updatePronunciationStats(card, percent) {
          const key = getFlashcardKey(card);
          if (!key) return;
          const stats = loadFlashcardStats();
          const entry = ensureStatsEntry(stats, key);
          const normalizedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
          pushLimited(entry.pronunciation, normalizedPercent, FLASHCARD_PRONUNCIATION_LIMIT);
          entry.spokenCount += 1;
          entry.lastSpokenAt = Date.now();
          saveFlashcardStats(stats);
        }

        function updateHeardStats(card) {
          const key = getFlashcardKey(card);
          if (!key) return;
          const stats = loadFlashcardStats();
          const entry = ensureStatsEntry(stats, key);
          entry.listenedCount += 1;
          entry.lastHeardAt = Date.now();
          saveFlashcardStats(stats);
        }

        function getPronuncia(card) {
          const key = getFlashcardKey(card);
          const entry = key ? flashcardStats[key] : null;
          if (!entry || !Array.isArray(entry.pronunciation) || !entry.pronunciation.length) return null;
          const total = entry.pronunciation.reduce((acc, value) => acc + value, 0);
          return Math.round(total / entry.pronunciation.length);
        }

        function getMetricAverage(entry, key) {
          if (!entry || !Array.isArray(entry[key]) || !entry[key].length) return null;
          const total = entry[key].reduce((acc, value) => acc + value, 0);
          return Math.round(total / entry[key].length);
        }

        function formatMetric(entry, key) {
          const average = getMetricAverage(entry, key);
          return average === null ? '--' : `${average}%`;
        }

        function buildRotatingPhrases(card, statsEntry = null) {
          if (statsEntry && isMemorySeeding(statsEntry)) {
            const remaining = formatRemainingSeeding(statsEntry);
            return [{ type: 'seeding', text: remaining }];
          }
          const portuguese = card.nomePortugues || 'Flashcard';
          const english = card.nomeIngles || '';
          const phrases = [];
          if (english) phrases.push({ type: 'text', text: english });
          phrases.push({ type: 'text', text: portuguese });
          return phrases;
        }

        function renderPhrase(target, phrase, options = {}) {
          if (!target) return;
          if (!phrase) {
            target.textContent = '';
            return;
          }
          if (phrase.type === 'seeding') {
            target.innerHTML = `<span class="seeding-timer">${SEEDING_TIMER_ICON}<span>${phrase.text}</span></span>`;
            return;
          }
          if (options.wrapSpan) {
            target.innerHTML = `<span>${phrase.text}</span>`;
            return;
          }
          target.textContent = phrase.text;
        }

        function getSpokenCount(card) {
          const key = getFlashcardKey(card);
          const entry = key ? flashcardStats[key] : null;
          if (!entry) return 0;
          if (typeof entry.spokenCount === 'number') return entry.spokenCount;
          if (!Array.isArray(entry.pronunciation)) return 0;
          return entry.pronunciation.length;
        }

        function getListeningCount(card) {
          const key = getFlashcardKey(card);
          const entry = key ? flashcardStats[key] : null;
          if (!entry) return 0;
          if (typeof entry.listenedCount === 'number') return entry.listenedCount;
          return 0;
        }

        function formatSince(timestamp) {
          if (!timestamp) return '--';
          const diffMs = Date.now() - timestamp;
          const diffMinutes = Math.floor(diffMs / 60000);
          if (diffMinutes < 1) return 'agora';
          if (diffMinutes < 60) return `${diffMinutes} min`;
          const diffHours = Math.floor(diffMinutes / 60);
          if (diffHours < 24) return `${diffHours} horas`;
          const diffDays = Math.floor(diffHours / 24);
          return `${diffDays} dias`;
        }

        function hasSupportedAudioExtension(fileName = '') {
          const lower = fileName.toLowerCase();
          return SUPPORTED_AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
        }

        function buildAudioSrc(audioName = '') {
          const trimmed = audioName.trim();
          if (!trimmed || !hasSupportedAudioExtension(trimmed)) return '';
          const sanitized = trimmed.replace(/^[/\\]+/, '');
          const encodedPath = sanitized
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');
          return sanitized.toLowerCase().startsWith('voices/') ? encodedPath : `voices/${encodedPath}`;
        }

        function buildImageSrc(fileName = '') {
          if (!fileName) return '';
          const encodedPath = fileName
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');
          return `images/${encodedPath}`;
        }

        function getStoredDay() {
          const stored = localStorage.getItem('vocabulary-level') || localStorage.getItem('pastaAtual');
          const numeric = Number.parseInt(stored || '1', 10);
          return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
        }

        function normalizeFlashcardEntry(entry, source, levelMap) {
          if (!entry || typeof entry !== 'object') return null;
          const file = entry.file || entry.imagem;
          const en = entry.en || entry.nomeIngles;
          if (!file || !en) return null;
          const pt = entry.pt || entry.nomePortugues || '';
          const categoria = entry.categoria || entry.category || entry.tense || '';
          const tense = entry.tense || '';
          const sentenceForm = entry.sentenceForm || entry.state || entry.estado || entry.form || '';
          const categoryLabel = String(categoria || '').trim();
          const numericCategory = Number(categoryLabel);
          const day = source === 'building'
            ? (Number.isFinite(numericCategory) && numericCategory > 0 ? numericCategory : 1)
            : (levelMap.get(file) || 1);
          return {
            id: `${source}:${file}:${en}`,
            file,
            nomePortugues: pt,
            nomeIngles: en,
            categoria: !Number.isFinite(numericCategory) ? categoryLabel : (entry.sentenceForm || entry.tense || ''),
            tense,
            sentenceForm,
            audio: entry.audio || '',
            audioSrc: buildAudioSrc(entry.audio || ''),
            imageSrc: buildImageSrc(file),
            source,
            day,
            active: true
          };
        }

        const ACCURACY_COLOR_STOPS = [
          { percent: 0, color: [128, 0, 32] },
          { percent: 50, color: [231, 76, 60] },
          { percent: 70, color: [243, 156, 18] },
          { percent: 85, color: [46, 204, 113] },
          { percent: 100, color: [47, 141, 255] }
        ];
        const ACCURACY_EMPTY_SPEAKING_COLOR = '23, 44, 107';
        const ACCURACY_COLOR_TRANSITION_MS = 1200;

        function interpolateColor(start, end, ratio) {
          const clampRatio = Math.max(0, Math.min(1, ratio));
          return start.map((channel, index) => {
            const value = channel + (end[index] - channel) * clampRatio;
            return Math.round(value);
          });
        }

        function getAccuracyColorRgb(accuracy) {
          if (accuracy === null || accuracy === undefined) {
            return ACCURACY_EMPTY_SPEAKING_COLOR;
          }
          const percent = Math.max(0, Math.min(100, Number(accuracy)));
          if (Number.isNaN(percent)) {
            return ACCURACY_EMPTY_SPEAKING_COLOR;
          }
          const upperIndex = ACCURACY_COLOR_STOPS.findIndex(stop => percent <= stop.percent);
          const lowerIndex = upperIndex <= 0 ? 0 : upperIndex - 1;
          const lowerStop = ACCURACY_COLOR_STOPS[lowerIndex];
          const upperStop = ACCURACY_COLOR_STOPS[Math.max(upperIndex, 0)];

          if (!upperStop) {
            return ACCURACY_COLOR_STOPS[ACCURACY_COLOR_STOPS.length - 1].color.join(', ');
          }

          if (upperStop.percent === lowerStop.percent) {
            return upperStop.color.join(', ');
          }

          const ratio = (percent - lowerStop.percent) / (upperStop.percent - lowerStop.percent);
          const blended = interpolateColor(lowerStop.color, upperStop.color, ratio);
          return blended.join(', ');
        }

        function parseRgbTriplet(value) {
          if (!value) return null;
          const parts = value.split(',').map(part => Number.parseFloat(part.trim()));
          if (parts.length < 3) return null;
          const channels = parts.slice(0, 3);
          if (channels.some(channel => Number.isNaN(channel))) return null;
          return channels;
        }

        function getCurrentAccuracyColor(element) {
          if (!element) return null;
          const computed = window.getComputedStyle(element).getPropertyValue('--accuracy-color').trim();
          return parseRgbTriplet(computed);
        }

        function animateAccuracyColor(element, targetRgb, duration = ACCURACY_COLOR_TRANSITION_MS) {
          if (!element || !targetRgb) return;
          const target = parseRgbTriplet(targetRgb);
          if (!target) return;
          const start = getCurrentAccuracyColor(element);
          if (!start) {
            element.style.setProperty('--accuracy-color', target.join(', '));
            return;
          }
          if (start.every((value, index) => value === target[index])) return;
          const startTime = window.performance.now();
          const easeOut = value => 1 - Math.pow(1 - value, 2);
          const step = now => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = easeOut(progress);
            const blended = interpolateColor(start, target, eased);
            element.style.setProperty('--accuracy-color', blended.join(', '));
            if (progress < 1) {
              window.requestAnimationFrame(step);
            }
          };
          window.requestAnimationFrame(step);
        }

        function applyTenseStyles(wrapper, card) {
          if (!wrapper || !card) return;
          const tenseStyle = TENSE_STYLES[card.tense] || {};
          const formStyle = SENTENCE_FORM_STYLES[card.sentenceForm] || {};
          wrapper.style.setProperty('--tense-ring', tenseStyle.ring || 'none');
          wrapper.style.setProperty('--tense-animation', tenseStyle.animation || 'none');
          wrapper.style.setProperty('--tense-glow', tenseStyle.glow || 'none');
          wrapper.style.setProperty('--tense-filter', tenseStyle.filter || 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25))');
          wrapper.style.setProperty('--tense-mask', tenseStyle.mask || 'none');
          wrapper.style.setProperty('--tense-lens', tenseStyle.lens || 'none');
          wrapper.style.setProperty('--form-ring', formStyle.ring || 'none');
          wrapper.style.setProperty('--form-animation', formStyle.animation || 'none');
          wrapper.style.setProperty('--form-glow', formStyle.glow || 'none');
          wrapper.style.setProperty('--form-lens', formStyle.lens || 'none');
        }

        function createFlashcardVisual(card, options = {}) {
          const visual = document.createElement('div');
          visual.className = `flashcard__visual ${options.className || ''}`.trim();
          applyTenseStyles(visual, card);

          const tenseRing = document.createElement('div');
          tenseRing.className = 'image-ring image-ring--tense';
          const formRing = document.createElement('div');
          formRing.className = 'image-ring image-ring--form';
          const tenseLens = document.createElement('div');
          tenseLens.className = 'image-lens image-lens--tense';
          const formLens = document.createElement('div');
          formLens.className = 'image-lens image-lens--form';

          const circle = document.createElement('div');
          circle.className = 'flashcard__circle';

          if (card.imageSrc) {
            const img = document.createElement('img');
            img.src = card.imageSrc;
            img.alt = card.nomePortugues || 'Flashcard';
            circle.appendChild(img);
          } else {
            circle.appendChild(createPlaceholder());
          }

          visual.appendChild(tenseRing);
          visual.appendChild(formRing);
          visual.appendChild(circle);
          visual.appendChild(tenseLens);
          visual.appendChild(formLens);
          return visual;
        }

        function clearPhraseIntervals() {
          phraseIntervals.forEach(intervalId => clearInterval(intervalId));
          phraseIntervals = [];
        }

        async function loadFlashcards() {
          const [imagesData, buildingData, levelsData] = await Promise.all([
            fetch('images/images.json')
              .then(response => (response.ok ? response.json() : []))
              .catch(() => []),
            fetch('images/building.json')
              .then(response => (response.ok ? response.json() : []))
              .catch(() => []),
            fetch('/api/image-levels').then(response => (response.ok ? response.json() : {})).catch(() => ({}))
          ]);

          const levelEntries = levelsData && typeof levelsData === 'object' ? levelsData.levels || {} : {};
          const levelMap = new Map(Object.entries(levelEntries).map(([fileName, value]) => [fileName, Number(value)]));

          const imageCards = Array.isArray(imagesData)
            ? imagesData.map(entry => normalizeFlashcardEntry(entry, 'images', levelMap)).filter(Boolean)
            : [];

          const buildingCards = Array.isArray(buildingData)
            ? buildingData.map(entry => normalizeFlashcardEntry(entry, 'building', levelMap)).filter(Boolean)
            : [];

          flashcards = [...imageCards, ...buildingCards];
        }

        function renderDays() {
          const days = Array.from(new Set(flashcards.map(card => card.day))).sort((a, b) => a - b);
          levelFilter.innerHTML = '';
          const storedDay = getStoredDay();
          days.forEach(day => {
            const option = document.createElement('option');
            option.value = String(day);
            option.textContent = `Dia ${day}`;
            if (day === storedDay) option.selected = true;
            levelFilter.appendChild(option);
          });
          if (!levelFilter.value && days.length) {
            levelFilter.value = String(days[0]);
          }
        }

        function createPlaceholder() {
          const placeholder = document.createElement('div');
          placeholder.className = 'flashcard__placeholder';
          const logo = document.createElement('img');
          logo.src = 'SVG/logo.svg';
          logo.alt = 'PlayTalk';
          const text = document.createElement('span');
          text.textContent = 'Toque para adicionar\nimagem';
          placeholder.appendChild(logo);
          placeholder.appendChild(text);
          return placeholder;
        }

        function renderCards() {
          flashcardStats = loadFlashcardStats();
          clearPhraseIntervals();
          const day = Number(levelFilter.value || getStoredDay());
          const dayCards = flashcards
            .filter(card => card.day === day && card.imageSrc);

          dayCards.sort((a, b) => {
            const aLabel = (a.nomePortugues || a.nomeIngles || '').trim();
            const bLabel = (b.nomePortugues || b.nomeIngles || '').trim();
            return aLabel.localeCompare(bLabel, 'pt-BR', { sensitivity: 'base' });
          });

          flashcardGrid.innerHTML = '';
          emptyState.hidden = dayCards.length > 0;

          dayCards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = `flashcard ${card.active ? '' : 'is-disabled'} ${card.id === selectedCardId ? 'is-selected' : ''}`.trim();
            cardEl.dataset.id = card.id;
            const key = getFlashcardKey(card);
            const statsEntry = key ? ensureStatsEntry(flashcardStats, key) : null;
            if (statsEntry && syncMemoryState(statsEntry)) {
              saveFlashcardStats(flashcardStats);
            }
            const isSeeding = Boolean(statsEntry && isMemorySeeding(statsEntry));
            let accuracyColor = getAccuracyColorRgb(getPronuncia(card));
            const cachedAccuracyColor = accuracyColorCache.get(card.id);
            if (cachedAccuracyColor) {
              cardEl.style.setProperty('--accuracy-color', cachedAccuracyColor);
            }
            animateAccuracyColor(cardEl, accuracyColor);
            accuracyColorCache.set(card.id, accuracyColor);
            cardEl.classList.toggle('is-seeding', isSeeding);
            cardEl.style.backgroundImage = `url('${getMemoryBackground(statsEntry)}')`;

            const visual = createFlashcardVisual(card);
            visual.addEventListener('click', event => {
              event.stopPropagation();
              handlePronunciaForCard(card);
            });
            cardEl.appendChild(visual);

            const phraseButton = document.createElement('button');
            phraseButton.type = 'button';
            phraseButton.className = 'flashcard__phrase';
            let phraseIndex = 0;
            phraseButton.classList.toggle('is-seeding', isSeeding);
            renderPhrase(phraseButton, buildRotatingPhrases(card, statsEntry)[phraseIndex]);
            phraseButton.addEventListener('click', event => {
              event.stopPropagation();
              if (statsEntry && isMemorySeeding(statsEntry)) return;
              playAudioForCard(card);
            });
            const intervalId = window.setInterval(() => {
              const phrases = buildRotatingPhrases(card, statsEntry);
              phraseIndex = (phraseIndex + 1) % phrases.length;
              renderPhrase(phraseButton, phrases[phraseIndex]);
            }, 3000);
            phraseIntervals.push(intervalId);
            cardEl.appendChild(phraseButton);

            const stars = document.createElement('div');
            stars.className = 'flashcard__stars';
            const streak = getMemoryStreakValue(statsEntry);
            for (let i = 0; i < MEMORY_STAR_COUNT; i += 1) {
              const star = document.createElement('span');
              const fillRatio = i < streak ? 1 : 0;
              star.className = 'flashcard__star';
              star.style.setProperty('--fill', `${fillRatio * 100}%`);
              star.textContent = '★';
              stars.appendChild(star);
            }
            cardEl.appendChild(stars);

            cardEl.addEventListener('pointerdown', event => {
              if (event.button && event.button !== 0) return;
              if (cardSeedingHoldTimer) {
                clearTimeout(cardSeedingHoldTimer);
                cardSeedingHoldTimer = null;
              }
              if (cardSeedingHoldInterval) {
                clearInterval(cardSeedingHoldInterval);
                cardSeedingHoldInterval = null;
              }
              const isCardSeeding = Boolean(statsEntry && isMemorySeeding(statsEntry));
              if (isCardSeeding) {
                cardSeedingHoldTimer = window.setTimeout(() => {
                  cardSeedingHoldInterval = window.setInterval(() => {
                    if (!statsEntry || !statsEntry.memorySeedingUntil) {
                      clearInterval(cardSeedingHoldInterval);
                      cardSeedingHoldInterval = null;
                      return;
                    }
                    const now = Date.now();
                    const decreaseMs = MEMORY_SEEDING_HOLD_DECREASE_HOURS * 60 * 60 * 1000;
                    statsEntry.memorySeedingUntil = Math.max(now, statsEntry.memorySeedingUntil - decreaseMs);
                    const changed = syncMemoryState(statsEntry);
                    saveFlashcardStats(flashcardStats);
                    const stillSeeding = isMemorySeeding(statsEntry);
                    cardEl.classList.toggle('is-seeding', stillSeeding);
                    phraseButton.classList.toggle('is-seeding', stillSeeding);
                    cardEl.style.backgroundImage = `url('${getMemoryBackground(statsEntry)}')`;
                    const phrases = buildRotatingPhrases(card, statsEntry);
                    phraseIndex = Math.min(phraseIndex, phrases.length - 1);
                    renderPhrase(phraseButton, phrases[phraseIndex]);
                    if (changed && !stillSeeding) {
                      clearInterval(cardSeedingHoldInterval);
                      cardSeedingHoldInterval = null;
                    }
                  }, 1000);
                }, MEMORY_SEEDING_HOLD_DELAY_MS);
                return;
              }
            });
            cardEl.addEventListener('pointerup', () => {
              if (cardSeedingHoldTimer) {
                clearTimeout(cardSeedingHoldTimer);
                cardSeedingHoldTimer = null;
              }
              if (cardSeedingHoldInterval) {
                clearInterval(cardSeedingHoldInterval);
                cardSeedingHoldInterval = null;
              }
            });
            cardEl.addEventListener('pointerleave', () => {
              if (cardSeedingHoldTimer) {
                clearTimeout(cardSeedingHoldTimer);
                cardSeedingHoldTimer = null;
              }
              if (cardSeedingHoldInterval) {
                clearInterval(cardSeedingHoldInterval);
                cardSeedingHoldInterval = null;
              }
            });
            cardEl.addEventListener('pointercancel', () => {
              if (cardSeedingHoldTimer) {
                clearTimeout(cardSeedingHoldTimer);
                cardSeedingHoldTimer = null;
              }
              if (cardSeedingHoldInterval) {
                clearInterval(cardSeedingHoldInterval);
                cardSeedingHoldInterval = null;
              }
            });
            cardEl.addEventListener('click', event => {
              if (event.defaultPrevented) return;
              openDetailForCard(card);
            });

            flashcardGrid.appendChild(cardEl);
          });

        }

        function openDetailModal() {
          detailModal.classList.add('is-open');
          detailModal.setAttribute('aria-hidden', 'false');
        }

        function closeDetailModal() {
          detailModal.classList.remove('is-open');
          detailModal.setAttribute('aria-hidden', 'true');
          if (detailPhraseInterval) {
            clearInterval(detailPhraseInterval);
            detailPhraseInterval = null;
          }
          selectedCardId = null;
          renderCards();
        }

        function openDetailForCard(card) {
          if (!card) return;
          const key = getFlashcardKey(card);
          const statsEntry = key ? ensureStatsEntry(flashcardStats, key) : null;
          if (statsEntry && isMemorySeeding(statsEntry)) {
            return;
          }
          selectedCardId = card.id;
          audioClickCount = 0;
          renderCards();
          updateDetail(card);
          openDetailModal();
        }

        function updateDetail(card) {
          flashcardStats = loadFlashcardStats();
          const key = getFlashcardKey(card);
          const stats = key ? ensureStatsEntry(flashcardStats, key) : null;
          const pronuncia = getPronuncia(card);
          detailPronuncia.textContent = pronuncia === null ? '--' : `${pronuncia}%`;
          detailSpeakings.textContent = `${getSpokenCount(card)}`;
          detailListenings.textContent = `${getListeningCount(card)}`;
          detailListening.textContent = formatMetric(stats, 'listening');
          detailReading.textContent = formatMetric(stats, 'reading');
          detailAssociation.textContent = formatMetric(stats, 'association');
          detailMeaning.textContent = formatMetric(stats, 'meaning');
          detailJogado.textContent = formatSince(stats?.lastPlayedAt);
          detailFalado.textContent = formatSince(stats?.lastSpokenAt);
          detailOuvido.textContent = formatSince(stats?.lastHeardAt);

          detailImage.innerHTML = '';
          const visual = createFlashcardVisual(card, { className: 'flashcard__visual--detail' });
          detailImage.appendChild(visual);

          let accuracyColor = getAccuracyColorRgb(pronuncia);
          animateAccuracyColor(detailPanel, accuracyColor);
          animateAccuracyColor(detailPronunciaCard, accuracyColor);
          const isSeeding = Boolean(stats && isMemorySeeding(stats));
          detailPanel.classList.toggle('is-seeding', isSeeding);
          detailPanel.style.backgroundImage = `url('${getMemoryBackground(stats)}')`;
          detailPhrase.classList.toggle('is-seeding', isSeeding);
          detailPhrase.disabled = isSeeding;

          const portuguese = card.nomePortugues || 'Flashcard';
          const english = card.nomeIngles || '';
          const phrases = buildRotatingPhrases(card, stats);
          detailPhrase.dataset.primary = portuguese;
          detailPhrase.dataset.secondary = english;
          renderPhrase(detailPhrase, phrases[0], { wrapSpan: true });

          if (detailPhraseInterval) {
            clearInterval(detailPhraseInterval);
            detailPhraseInterval = null;
          }
          let phraseIndex = 0;
          detailPhraseInterval = window.setInterval(() => {
            const currentPhrases = buildRotatingPhrases(card, stats);
            phraseIndex = (phraseIndex + 1) % currentPhrases.length;
            renderPhrase(detailPhrase, currentPhrases[phraseIndex], { wrapSpan: true });
          }, 3000);
        }

        function setupSpeechRecognition() {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
          }
        }

        function ensureMicrophoneAccess() {
          if (micPermissionPromise) return micPermissionPromise;
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            micPermissionPromise = Promise.resolve(false);
            return micPermissionPromise;
          }
          micPermissionPromise = navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              stream.getTracks().forEach(track => track.stop());
              return true;
            })
            .catch(() => false);
          return micPermissionPromise;
        }

        function listenForSpeech() {
          if (!recognition) {
            const typed = window.prompt('Diga a frase em inglês:') || '';
            return Promise.resolve(typed);
          }
          return new Promise(resolve => {
            let resolved = false;
            const stopRecognition = () => {
              if (recognition && typeof recognition.stop === 'function') {
                try {
                  recognition.stop();
                } catch (error) {
                  // ignore
                }
              }
            };
            const finalize = (value) => {
              if (resolved) return;
              resolved = true;
              stopRecognition();
              resolve(value);
            };
            recognition.onresult = event => {
              const text = Array.from(event.results)
                .map(result => result[0] && result[0].transcript)
                .join(' ');
              finalize(text);
            };
            recognition.onerror = () => finalize('');
            recognition.onend = () => finalize('');
            try {
              recognition.start();
            } catch (error) {
              if (error && error.name === 'InvalidStateError') {
                try {
                  recognition.stop();
                  recognition.start();
                } catch (restartError) {
                  finalize('');
                }
              } else {
                finalize('');
              }
            }
          });
        }

        async function handlePronunciaForCard(card) {
          if (!card) return;
          await ensureMicrophoneAccess();
          flashcardStats = loadFlashcardStats();
          const entry = getFlashcardKey(card);
          if (entry) {
            ensureStatsEntry(flashcardStats, entry);
          }
          setListeningState(card.id, true);
          try {
            const spoken = await listenForSpeech();
            const normalizedSpoken = normalizeSpeechText(spoken);
            if (normalizedSpoken === 'i want to see the gold' || normalizedSpoken === 'i like i like i like gold') {
              openSeedStageModal(card);
              return;
            }
            const percent = Math.round(calculateSequenceMatchPercent(card.nomeIngles || '', spoken));
            updatePronunciationStats(card, percent);
            if (selectedCardId === card.id) {
              updateDetail(card);
            }
            renderCards();
          } finally {
            setListeningState(card.id, false);
          }
        }

        function playAudioForCard(card) {
          if (!card || !card.audioSrc) return;
          const entryKey = getFlashcardKey(card);
          if (entryKey) {
            ensureStatsEntry(loadFlashcardStats(), entryKey);
          }

          if (audioInstance) {
            audioInstance.pause();
            audioInstance.currentTime = 0;
          }

          audioClickCount += 1;
          const rate = audioClickCount % 2 === 0 ? 0.75 : 1;
          audioInstance = new Audio(card.audioSrc);
          audioInstance.playbackRate = rate;
          audioInstance.preservesPitch = true;
          audioInstance.mozPreservesPitch = true;
          audioInstance.webkitPreservesPitch = true;
          audioInstance.play().catch(() => {});
          updateHeardStats(card);
          if (selectedCardId === card.id) {
            updateDetail(card);
          }
        }

        function openSeedStageModal(card) {
          if (!card) return;
          stageTargetCard = card;
          seedStageModal.classList.add('is-open');
          seedStageModal.setAttribute('aria-hidden', 'false');
        }

        function closeSeedStageModal() {
          seedStageModal.classList.remove('is-open');
          seedStageModal.setAttribute('aria-hidden', 'true');
          stageTargetCard = null;
        }

        function renderSeedStageOptions() {
          if (!seedStageGrid) return;
          seedStageGrid.innerHTML = '';
          MEMORY_STAGE_OPTIONS.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'seed-stage-option';
            button.dataset.stage = String(option.stage);
            const img = document.createElement('img');
            img.src = option.image;
            img.alt = option.label;
            const text = document.createElement('span');
            text.textContent = option.label;
            button.appendChild(img);
            button.appendChild(text);
            seedStageGrid.appendChild(button);
          });
        }

        function applySeedStageSelection(stage) {
          if (!stageTargetCard) return;
          const key = getFlashcardKey(stageTargetCard);
          if (!key) return;
          const stats = loadFlashcardStats();
          const entry = ensureStatsEntry(stats, key);
          entry.memoryStage = stage;
          entry.memorySeedingUntil = null;
          entry.memoryStreak = 0;
          if (stage < 4) {
            entry.memoryMastered = false;
          }
          saveFlashcardStats(stats);
          if (selectedCardId === stageTargetCard.id) {
            updateDetail(stageTargetCard);
          }
          renderCards();
        }

        function playAudio() {
          if (!selectedCardId) return;
          const card = flashcards.find(item => item.id === selectedCardId);
          playAudioForCard(card);
        }

        async function handlePronunciaForSelected() {
          if (!selectedCardId) return;
          const card = flashcards.find(item => item.id === selectedCardId);
          if (!card) return;
          await handlePronunciaForCard(card);
        }

        function setListeningState(cardId, isListening) {
          const cardEl = flashcardGrid.querySelector(`[data-id="${cardId}"]`);
          if (cardEl) {
            const phraseButton = cardEl.querySelector('.flashcard__phrase');
            if (phraseButton) {
              phraseButton.classList.toggle('is-listening', isListening);
            }
          }
          if (selectedCardId === cardId) {
            detailPhrase.classList.toggle('is-listening', isListening);
          }
        }

        function openEditModal() {
          if (!selectedCardId) return;
          const card = flashcards.find(item => item.id === selectedCardId);
          if (!card) return;
          editImage.value = card.imageSrc || '';
          editPortuguese.value = card.nomePortugues || '';
          editEnglish.value = card.nomeIngles || '';
          editCategory.value = card.categoria || '';
          editState.value = card.active ? 'active' : 'inactive';
          editModal.classList.add('is-open');
          editModal.setAttribute('aria-hidden', 'false');
        }

        function closeEditModal() {
          editModal.classList.remove('is-open');
          editModal.setAttribute('aria-hidden', 'true');
        }

        function saveEditModal() {
          if (!selectedCardId) return;
          const card = flashcards.find(item => item.id === selectedCardId);
          if (!card) return;
          const imageInput = editImage.value.trim();
          card.imageSrc = imageInput || card.imageSrc;
          card.nomePortugues = editPortuguese.value.trim() || 'Sem frase em português';
          card.nomeIngles = editEnglish.value.trim() || 'Sem frase em inglês';
          card.categoria = editCategory.value.trim() || 'Flashcard';
          card.active = editState.value === 'active';
          renderCards();
          updateDetail(card);
          closeEditModal();
        }

        levelFilter.addEventListener('change', () => {
          closeDetailModal();
        });

        cancelEdit.addEventListener('click', closeEditModal);
        saveEdit.addEventListener('click', saveEditModal);
        detailImage.addEventListener('pointerdown', event => {
          if (!selectedCardId) return;
          event.preventDefault();
          detailLongPressTriggered = false;
          if (detailPressTimer) {
            clearTimeout(detailPressTimer);
          }
          detailPressTimer = window.setTimeout(() => {
            detailLongPressTriggered = true;
            openEditModal();
          }, 500);
        });
        detailImage.addEventListener('pointerup', () => {
          if (detailPressTimer) {
            clearTimeout(detailPressTimer);
            detailPressTimer = null;
          }
          if (!detailLongPressTriggered) {
            handlePronunciaForSelected();
          }
          detailLongPressTriggered = false;
        });
        detailImage.addEventListener('pointerleave', () => {
          if (detailPressTimer) {
            clearTimeout(detailPressTimer);
            detailPressTimer = null;
          }
          detailLongPressTriggered = false;
        });
        detailImage.addEventListener('pointercancel', () => {
          if (detailPressTimer) {
            clearTimeout(detailPressTimer);
            detailPressTimer = null;
          }
          detailLongPressTriggered = false;
        });
        detailPhrase.addEventListener('click', playAudio);
        detailClose.addEventListener('click', closeDetailModal);
        detailModal.addEventListener('click', event => {
          if (event.target === detailModal) closeDetailModal();
        });
        editModal.addEventListener('click', event => {
          if (event.target === editModal) closeEditModal();
        });
        renderSeedStageOptions();
        closeSeedStage.addEventListener('click', closeSeedStageModal);
        seedStageModal.addEventListener('click', event => {
          if (event.target === seedStageModal) closeSeedStageModal();
        });
        seedStageGrid.addEventListener('click', event => {
          const button = event.target.closest('.seed-stage-option');
          if (!button) return;
          const stage = Number.parseInt(button.dataset.stage || '', 10);
          if (!Number.isFinite(stage)) return;
          applySeedStageSelection(stage);
          closeSeedStageModal();
        });
        openMemoryGame.addEventListener('click', () => {
          if (gameModeModal) {
            gameModeModal.classList.add('is-open');
            gameModeModal.setAttribute('aria-hidden', 'false');
          }
        });

        function closeGameModeModal() {
          if (!gameModeModal) return;
          gameModeModal.classList.remove('is-open');
          gameModeModal.setAttribute('aria-hidden', 'true');
        }

        function openGameMode(mode) {
          const day = levelFilter.value || String(getStoredDay());
          if (day) {
            localStorage.setItem('vocabulary-level', String(day));
          }
          if (mode === 'memory') {
            window.open(`memory-game.html?day=${encodeURIComponent(day)}`, '_blank', 'noopener,noreferrer');
            return;
          }
          const url = `game.html?mode=${encodeURIComponent(mode)}&day=${encodeURIComponent(day)}&source=flashcards`;
          window.open(url, '_blank', 'noopener,noreferrer');
        }

        if (gameModeModal) {
          gameModeModal.addEventListener('click', event => {
            if (event.target === gameModeModal) closeGameModeModal();
          });
        }

        if (closeGameMode) {
          closeGameMode.addEventListener('click', closeGameModeModal);
        }

        document.querySelectorAll('[data-game-mode]').forEach(button => {
          button.addEventListener('click', () => {
            const mode = button.dataset.gameMode;
            closeGameModeModal();
            if (mode) {
              openGameMode(mode);
            }
          });
        });

        function refreshFlashcardsFromStorage() {
          flashcardStats = loadFlashcardStats();
          renderCards();
          if (detailModal.classList.contains('is-open') && selectedCardId) {
            const card = flashcards.find(item => item.id === selectedCardId);
            if (card) {
              updateDetail(card);
            }
          }
        }

        window.addEventListener('storage', event => {
          if (event.key === FLASHCARD_STATS_STORAGE_KEY) {
            refreshFlashcardsFromStorage();
          }
        });

        document.addEventListener('playtalk:flashcard-update', () => {
          refreshFlashcardsFromStorage();
        });

        async function initializePage() {
          setupSpeechRecognition();
          await loadMirrorGroups();
          await loadFlashcards();
          renderDays();
          renderCards();
        }

        initializePage();
  };

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-fun', initFunPage);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFunPage, { once: true });
  } else {
    initFunPage();
  }
})();
