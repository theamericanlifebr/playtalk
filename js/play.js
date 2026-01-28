(() => {
  let initialized = false;

  const initPlayPage = () => {
    if (initialized) return;
    initialized = true;
        const FLASHCARD_STATS_STORAGE_KEY = 'playtalk-flashcard-stats';
        const FLASHCARD_PRONUNCIATION_LIMIT = 6;
        const FLASHCARD_METRIC_LIMIT = 10;
        const PLAY_MODE_STORAGE_KEY = 'playtalk-play-mode';
        const CONNECT_CHOICES = 4;
        const MEMORY_HISTORY_LIMIT = 10;
        const MEMORY_SEEDING_DAYS = [3, 7, 15, 30];
        const MEMORY_STAR_COUNT = 6;
        const MEMORY_DECK_STORAGE_KEY = 'playtalk-memory-deck';
        const MEMORY_DECK_INITIAL = 6;
        const MEMORY_DECK_ADD = 2;
        const MEMORY_DECK_MAX = 24;
        const MEMORY_BACKGROUND_IMAGES = {
          0: 'images/galaxy.png',
          1: 'images/gold.png',
          2: 'images/diamond.png',
          3: 'images/mind.png',
          4: 'images/connect.png'
        };
        const MEMORY_SEEDING_BACKGROUND = 'images/seeding.png';
        const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.opus', '.ogg', '.webm'];
        const MIRROR_PATH = 'data/mirror.json';
        const MEMORY_EFFECT_SOUNDS = {
          star: 'gamesounds/star.mp3',
          starless: 'gamesounds/starless.mp3',
          seeding: 'gamesounds/seeding.mp3',
          report: 'gamesounds/report.wav'
        };
        const CARD_SLIDE_DURATION = 500;
        const SEEDING_DISSOLVE_DURATION = 3000;
        const CARD_SNOOZE_DAYS = 10;
        const SWIPE_DISMISS_DISTANCE = 80;
        const SWIPE_ACTIVATION_DISTANCE = 16;

        const playModeMenu = document.getElementById('playModeMenu');
        const modeButtons = Array.from(document.querySelectorAll('[data-play-mode]'));
        const memoryGame = document.getElementById('memoryGame');
        const connectGame = document.getElementById('connectGame');
        const connectGrid = document.getElementById('connectGrid');
        const connectPrompt = document.getElementById('connectPrompt');
        const memoryCard = document.getElementById('memoryCard');
        const memoryCircle = document.getElementById('memoryCircle');
        const memoryStars = document.getElementById('memoryStars');
        const memoryPrompt = document.getElementById('memoryPrompt');
        const memoryEmpty = document.getElementById('memoryEmpty');
        const memoryLevelLabel = document.getElementById('memoryLevelLabel');
        const memoryLens = document.getElementById('memoryLens');
        const memoryVisual = document.getElementById('memoryVisual');
        const memoryCardBackground = document.getElementById('memoryCardBackground');
        const memoryCardBackgroundFade = document.getElementById('memoryCardBackgroundFade');

        let flashcards = [];
        let availableCards = [];
        let currentCard = null;
        let currentMode = null;
        let recognition = null;
        let mirrorGroups = [];
        let isListening = false;
        let micPermissionPromise = null;
        let memoryDeck = [];
        let holdSeedingBackground = false;
        let backgroundTransitionTimer = null;
        let idlePromptTimer = null;
        let swipePointerId = null;
        let swipeStartX = 0;
        let swipeStartY = 0;
        let swipeDeltaX = 0;
        let isSwiping = false;
        const PROMPT_IDLE_DELAY = 5000;

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

        const ACCURACY_COLOR_STOPS = [
          { percent: 0, color: [128, 0, 32] },
          { percent: 50, color: [231, 76, 60] },
          { percent: 70, color: [243, 156, 18] },
          { percent: 85, color: [46, 204, 113] },
          { percent: 100, color: [47, 141, 255] }
        ];
        const ACCURACY_EMPTY_SPEAKING_COLOR = '23, 44, 107';
        const ACCURACY_COLOR_TRANSITION_MS = 1000;

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
          document.dispatchEvent(new CustomEvent('playtalk:flashcard-update'));
        }

        function loadMemoryDeckState() {
          try {
            const stored = localStorage.getItem(MEMORY_DECK_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
          } catch (error) {
            return {};
          }
        }

        function saveMemoryDeckState(state) {
          localStorage.setItem(MEMORY_DECK_STORAGE_KEY, JSON.stringify(state));
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

        function animateAccuracyColor(element, targetRgb, duration = ACCURACY_COLOR_TRANSITION_MS) {
          if (!element || !targetRgb) return;
          element.style.setProperty('--accuracy-color', targetRgb);
          if (!duration) return;
          element.style.transition = `background ${duration}ms ease`;
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
              memoryMastered: false,
              snoozedUntil: null
            };
          }
          if (!Array.isArray(stats[key].memoryHistory)) {
            stats[key].memoryHistory = [];
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
          if (typeof stats[key].snoozedUntil !== 'number') {
            stats[key].snoozedUntil = null;
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

        function markCardPlayed(card) {
          const key = getFlashcardKey(card);
          if (!key) return;
          const stats = loadFlashcardStats();
          const entry = ensureStatsEntry(stats, key);
          entry.lastPlayedAt = Date.now();
          saveFlashcardStats(stats);
        }

        function recordFlashcardMetric(card, metricKey, percent) {
          const key = getFlashcardKey(card);
          if (!key) return;
          const stats = loadFlashcardStats();
          const entry = ensureStatsEntry(stats, key);
          const normalizedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
          pushLimited(entry[metricKey], normalizedPercent, FLASHCARD_METRIC_LIMIT);
          entry.lastPlayedAt = Date.now();
          saveFlashcardStats(stats);
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
          if (entry.memoryMastered && entry.memoryStage !== 4) {
            entry.memoryStage = 4;
            changed = true;
          }
          return changed;
        }

        function syncSnoozedState(entry) {
          if (!entry) return false;
          const now = Date.now();
          if (entry.snoozedUntil && now >= entry.snoozedUntil) {
            entry.snoozedUntil = null;
            return true;
          }
          return false;
        }

        function isMemorySeeding(entry) {
          return Boolean(entry?.memorySeedingUntil && Date.now() < entry.memorySeedingUntil);
        }

        function isCardSnoozed(entry) {
          return Boolean(entry?.snoozedUntil && Date.now() < entry.snoozedUntil);
        }

        function snoozeCard(card, days = CARD_SNOOZE_DAYS) {
          const key = getFlashcardKey(card);
          if (!key) return;
          const stats = loadFlashcardStats();
          const entry = ensureStatsEntry(stats, key);
          entry.snoozedUntil = Date.now() + days * 24 * 60 * 60 * 1000;
          saveFlashcardStats(stats);
        }

        function recordMemoryAttempt(card, wasCorrect) {
          const key = getFlashcardKey(card);
          if (!key) return { seeded: false, mastered: false };
          const stats = loadFlashcardStats();
          const entry = ensureStatsEntry(stats, key);
          const now = Date.now();
          syncMemoryState(entry);
          if (entry.memorySeedingUntil && now < entry.memorySeedingUntil) {
            saveFlashcardStats(stats);
            return { seeded: false, mastered: false };
          }

          entry.memoryHistory.push(Boolean(wasCorrect));
          while (entry.memoryHistory.length > MEMORY_HISTORY_LIMIT) {
            entry.memoryHistory.shift();
          }

          if (entry.memoryMastered) {
            entry.memoryStreak = MEMORY_STAR_COUNT;
            saveFlashcardStats(stats);
            return { seeded: false, mastered: true };
          }

          if (wasCorrect) {
            entry.memoryStreak = Math.min(entry.memoryStreak + 1, MEMORY_STAR_COUNT);
          } else {
            entry.memoryStreak = 0;
          }

          let seeded = false;
          let mastered = false;

          if (entry.memoryStage <= 3 && entry.memoryStreak >= MEMORY_STAR_COUNT) {
            const days = MEMORY_SEEDING_DAYS[entry.memoryStage] || 3;
            entry.memorySeedingUntil = now + days * 24 * 60 * 60 * 1000;
            entry.memoryStreak = 0;
            seeded = true;
          }

          if (entry.memoryStage === 4 && entry.memoryStreak >= MEMORY_STAR_COUNT) {
            entry.memoryMastered = true;
            entry.memoryStage = 4;
            entry.memoryStreak = MEMORY_STAR_COUNT;
            mastered = true;
          }

          saveFlashcardStats(stats);
          return { seeded, mastered };
        }

        function updatePronunciationStats(card, percent) {
          const key = getFlashcardKey(card);
          if (!key) return;
          const stats = loadFlashcardStats();
          const entry = ensureStatsEntry(stats, key);
          const normalizedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
          entry.pronunciation.push(normalizedPercent);
          while (entry.pronunciation.length > FLASHCARD_PRONUNCIATION_LIMIT) {
            entry.pronunciation.shift();
          }
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
          const stats = loadFlashcardStats();
          const entry = key ? stats[key] : null;
          if (!entry || !Array.isArray(entry.pronunciation) || !entry.pronunciation.length) return null;
          const total = entry.pronunciation.reduce((acc, value) => acc + value, 0);
          return Math.round(total / entry.pronunciation.length);
        }

        function getMemoryBackground(entry) {
          if (isMemorySeeding(entry)) {
            return MEMORY_SEEDING_BACKGROUND;
          }
          const stage = entry?.memoryStage ?? 0;
          return MEMORY_BACKGROUND_IMAGES[stage] || MEMORY_BACKGROUND_IMAGES[0];
        }

        function getMemoryStreak(entry) {
          if (!entry) return 0;
          if (entry.memoryMastered) return MEMORY_STAR_COUNT;
          if (isMemorySeeding(entry)) return MEMORY_STAR_COUNT;
          return Math.max(0, Math.min(MEMORY_STAR_COUNT, Number(entry.memoryStreak) || 0));
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
          wrapper.style.setProperty('--form-lens', formStyle.lens || 'none');
        }

        function buildImageSrc(fileName = '') {
          if (!fileName) return '';
          const encodedPath = fileName
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');
          return `images/${encodedPath}`;
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

        function buildGoogleTtsUrl(text) {
          const query = encodeURIComponent(text || '');
          return `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=${query}`;
        }

        function playAudioElement(audio) {
          return new Promise(resolve => {
            if (!audio) {
              resolve(false);
              return;
            }
            const cleanup = () => {
              audio.removeEventListener('ended', handleEnded);
              audio.removeEventListener('error', handleError);
            };
            const handleEnded = () => {
              cleanup();
              resolve(true);
            };
            const handleError = () => {
              cleanup();
              resolve(false);
            };
            audio.addEventListener('ended', handleEnded);
            audio.addEventListener('error', handleError);
            const playResult = audio.play();
            if (playResult && typeof playResult.then === 'function') {
              playResult.catch(handleError);
            }
          });
        }

        async function playPronunciation(card) {
          if (!card) return;
          const text = card.nomeIngles || '';
          const audioSrc = card.audioSrc || '';
          updateHeardStats(card);
          if (audioSrc) {
            const audio = new Audio(audioSrc);
            const played = await playAudioElement(audio);
            if (played) return;
          }
          const ttsUrl = buildGoogleTtsUrl(text);
          if (!ttsUrl || !text) return;
          const ttsAudio = new Audio(ttsUrl);
          await playAudioElement(ttsAudio);
        }

        function normalizeFlashcardEntry(entry, source, levelMap) {
          if (!entry || typeof entry !== 'object') return null;
          const file = entry.file || entry.imagem;
          const en = entry.en || entry.nomeIngles;
          if (!file || !en) return null;
          const pt = entry.pt || entry.nomePortugues || '';
          const categoria = entry.categoria || entry.category || entry.tense || '';
          const audio = entry.audio || '';
          const tense = entry.tense || '';
          const sentenceForm = entry.sentenceForm || entry.state || entry.estado || entry.form || '';
          const numericCategory = Number(categoria);
          const day = source === 'building'
            ? (Number.isFinite(numericCategory) && numericCategory > 0 ? numericCategory : 1)
            : (levelMap.get(file) || 1);
          return {
            id: `${source}:${file}:${en}`,
            file,
            nomePortugues: pt,
            nomeIngles: en,
            imageSrc: buildImageSrc(file),
            audio,
            audioSrc: buildAudioSrc(audio),
            day,
            tense,
            sentenceForm
          };
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

        function getStoredDay() {
          const stored = localStorage.getItem('vocabulary-level') || localStorage.getItem('pastaAtual');
          const numeric = Number.parseInt(stored || '1', 10);
          return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
        }

        function getDayFromQuery() {
          const params = new URLSearchParams(window.location.search);
          const value = Number.parseInt(params.get('day') || '', 10);
          if (Number.isFinite(value) && value > 0) return value;
          return getStoredDay();
        }

        function getStoredMode() {
          const stored = localStorage.getItem(PLAY_MODE_STORAGE_KEY);
          return stored || 'memory';
        }

        function setStoredMode(mode) {
          localStorage.setItem(PLAY_MODE_STORAGE_KEY, mode);
        }

        function setMode(mode) {
          currentMode = mode;
          setStoredMode(mode);
          modeButtons.forEach(button => {
            button.classList.toggle('is-active', button.dataset.playMode === mode);
          });
          if (memoryGame) {
            memoryGame.hidden = mode === 'association';
          }
          if (connectGame) {
            connectGame.hidden = mode !== 'association';
          }
          if (memoryStars) {
            memoryStars.hidden = mode !== 'memory';
          }
          if (memoryPrompt && mode !== 'reading') {
            memoryPrompt.textContent = 'Speak now';
            hidePrompt();
          }
        }

        function getDayCards(day) {
          return flashcards.filter(card => card.day === day && card.imageSrc);
        }

        function shuffleArray(values) {
          const array = [...values];
          for (let i = array.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        }

        function pickRandomCards(cards, count, excludeIds = new Set(), stats = null) {
          const candidates = cards.filter(card => {
            if (excludeIds.has(card.id)) return false;
            if (!stats) return true;
            const key = getFlashcardKey(card);
            const entry = key ? ensureStatsEntry(stats, key) : null;
            return entry ? !isMemorySeeding(entry) && !isCardSnoozed(entry) : true;
          });
          return shuffleArray(candidates).slice(0, count);
        }

        function ensureMemoryDeck(day, dayCards, stats = null) {
          const state = loadMemoryDeckState();
          const validIds = new Set(dayCards.map(card => card.id));
          let deck = Array.isArray(state[day]) ? state[day].filter(id => validIds.has(id)) : [];
          if (!deck.length && dayCards.length) {
            deck = pickRandomCards(dayCards, Math.min(MEMORY_DECK_INITIAL, dayCards.length), new Set(), stats)
              .map(card => card.id);
          }
          state[day] = deck;
          saveMemoryDeckState(state);
          return deck;
        }

        function updateDeckForSeeding(day, dayCards, stats, seededIds) {
          if (!seededIds.length) return memoryDeck;
          const state = loadMemoryDeckState();
          let deck = Array.isArray(state[day]) ? state[day] : [];
          deck = deck.filter(id => !seededIds.includes(id));
          const maxAdditions = Math.min(MEMORY_DECK_MAX - deck.length, seededIds.length * MEMORY_DECK_ADD);
          if (maxAdditions > 0) {
            const exclude = new Set(deck);
            const additions = pickRandomCards(dayCards, maxAdditions, exclude, stats).map(card => card.id);
            deck = deck.concat(additions);
          }
          state[day] = deck;
          saveMemoryDeckState(state);
          memoryDeck = deck;
          return deck;
        }

        function refreshAvailableCards(day) {
          const stats = loadFlashcardStats();
          let changed = false;
          const dayCards = getDayCards(day);
          let deck = ensureMemoryDeck(day, dayCards, stats);
          const seededIds = [];
          deck.forEach(id => {
            const card = dayCards.find(item => item.id === id);
            if (!card) return;
            const key = getFlashcardKey(card);
            const entry = key ? ensureStatsEntry(stats, key) : null;
            if (entry && syncMemoryState(entry)) {
              changed = true;
            }
            if (entry && syncSnoozedState(entry)) {
              changed = true;
            }
            if (entry && isMemorySeeding(entry)) {
              seededIds.push(id);
            }
          });
          if (seededIds.length) {
            deck = updateDeckForSeeding(day, dayCards, stats, seededIds);
          } else {
            memoryDeck = deck;
          }
          availableCards = deck
            .map(id => dayCards.find(card => card.id === id))
            .filter(card => card && (() => {
              const key = getFlashcardKey(card);
              const entry = key ? ensureStatsEntry(stats, key) : null;
              return entry ? !isMemorySeeding(entry) && !isCardSnoozed(entry) : true;
            })());
          if (changed) saveFlashcardStats(stats);
        }

        function renderStars(entry) {
          renderStarsWithStreak(getMemoryStreak(entry));
        }

        function renderStarsWithStreak(streak) {
          memoryStars.innerHTML = '';
          for (let i = 0; i < MEMORY_STAR_COUNT; i += 1) {
            const star = document.createElement('span');
            star.className = 'memory-star';
            if (i >= streak) {
              star.classList.add('is-empty');
            }
            star.textContent = '★';
            memoryStars.appendChild(star);
          }
        }

        function delay(ms) {
          return new Promise(resolve => {
            window.setTimeout(resolve, ms);
          });
        }

        function playEffectSound(src) {
          if (!src) return;
          const audio = new Audio(src);
          const playResult = audio.play();
          if (playResult && typeof playResult.catch === 'function') {
            playResult.catch(() => {});
          }
        }

        async function animateStarLoss(streak) {
          if (streak <= 0) return;
          renderStarsWithStreak(streak);
          const stars = Array.from(memoryStars.querySelectorAll('.memory-star'));
          for (let i = streak - 1; i >= 0; i -= 1) {
            const star = stars[i];
            if (star) {
              star.style.setProperty('--fill', '0%');
            }
            playEffectSound(MEMORY_EFFECT_SOUNDS.starless);
            await delay(500);
          }
        }

        function updateAccuracyLens(card) {
          if (!memoryCard || !card) return;
          const pronuncia = getPronuncia(card);
          const color = getAccuracyColorRgb(pronuncia);
          memoryCard.style.setProperty('--accuracy-color', color);
        }

        function setMemoryBackground(url) {
          if (!memoryCardBackground || !url) return;
          memoryCardBackground.style.backgroundImage = `url('${url}')`;
        }

        function dissolveMemoryBackground(url, duration = SEEDING_DISSOLVE_DURATION) {
          if (!memoryCardBackground || !memoryCardBackgroundFade || !url) return;
          if (backgroundTransitionTimer) {
            window.clearTimeout(backgroundTransitionTimer);
          }
          memoryCardBackgroundFade.style.transition = `opacity ${duration}ms ease`;
          memoryCardBackgroundFade.style.backgroundImage = `url('${url}')`;
          memoryCardBackgroundFade.style.opacity = '0';
          window.requestAnimationFrame(() => {
            memoryCardBackgroundFade.style.opacity = '1';
          });
          backgroundTransitionTimer = window.setTimeout(() => {
            setMemoryBackground(url);
            memoryCardBackgroundFade.style.opacity = '0';
            backgroundTransitionTimer = null;
          }, duration);
        }

        function renderCard(card) {
          if (!card) return;
          const stats = loadFlashcardStats();
          const key = getFlashcardKey(card);
          const entry = key ? ensureStatsEntry(stats, key) : null;
          if (entry && syncMemoryState(entry)) {
            saveFlashcardStats(stats);
          }
          applyTenseStyles(memoryVisual, card);
          memoryCircle.innerHTML = '';
          const img = document.createElement('img');
          const imageSrc = currentMode === 'listening' ? 'images/sound.png' : card.imageSrc;
          img.src = imageSrc;
          img.alt = currentMode === 'listening' ? 'Som' : (card.nomePortugues || 'Flashcard');
          memoryCircle.appendChild(img);
          const nextBackground = getMemoryBackground(entry);
          if (holdSeedingBackground) {
            const applyBackground = () => {
              setMemoryBackground(nextBackground);
              holdSeedingBackground = false;
            };
            if (img.complete) {
              applyBackground();
            } else {
              img.addEventListener('load', applyBackground, { once: true });
              img.addEventListener('error', applyBackground, { once: true });
            }
          } else {
            setMemoryBackground(nextBackground);
          }
          updateAccuracyLens(card);
          renderStars(entry);
          markCardPlayed(card);
          if (currentMode === 'reading') {
            memoryPrompt.textContent = card.nomeIngles || '';
            showPrompt(memoryPrompt.textContent);
          } else {
            scheduleIdlePrompt();
          }
          if (currentMode === 'listening') {
            showPrompt('Listen');
            playPronunciation(card).finally(() => {
              if (currentMode !== 'listening') return;
              scheduleIdlePrompt('Speak now', { showNow: true });
            });
          }
        }

        function transitionToCard(card, animate = false) {
          if (!card) return;
          if (!animate) {
            currentCard = card;
            renderCard(card);
            return;
          }
          if (memoryCard.classList.contains('memory-card--sliding')) {
            currentCard = card;
            renderCard(card);
            return;
          }
          playEffectSound(MEMORY_EFFECT_SOUNDS.report);
          memoryCard.classList.add('memory-card--sliding');
          window.setTimeout(() => {
            currentCard = card;
            renderCard(card);
          }, CARD_SLIDE_DURATION / 2);
          window.setTimeout(() => {
            memoryCard.classList.remove('memory-card--sliding');
          }, CARD_SLIDE_DURATION);
        }

        function getPlayableCards(day) {
          const stats = loadFlashcardStats();
          let changed = false;
          const playable = getDayCards(day).filter(card => {
            const key = getFlashcardKey(card);
            const entry = key ? ensureStatsEntry(stats, key) : null;
            if (entry && syncSnoozedState(entry)) {
              changed = true;
            }
            if (entry && syncMemoryState(entry)) {
              changed = true;
            }
            return entry ? !isMemorySeeding(entry) && !isCardSnoozed(entry) : true;
          });
          if (changed) saveFlashcardStats(stats);
          return playable;
        }

        function pickNextCard(day, animate = false) {
          if (currentMode === 'association') {
            renderConnectRound(day);
            return;
          }
          if (currentMode === 'memory') {
            refreshAvailableCards(day);
            if (!availableCards.length) {
              currentCard = null;
              memoryCard.hidden = true;
              memoryEmpty.hidden = false;
              clearIdlePromptTimer();
              hidePrompt();
              return;
            }
            memoryEmpty.hidden = true;
            memoryCard.hidden = false;
            let next = availableCards[Math.floor(Math.random() * availableCards.length)];
            if (currentCard && availableCards.length > 1) {
              while (next.id === currentCard.id) {
                next = availableCards[Math.floor(Math.random() * availableCards.length)];
              }
            }
            transitionToCard(next, animate);
            return;
          }
          const pool = getPlayableCards(day);
          if (!pool.length) {
            currentCard = null;
            memoryCard.hidden = true;
            memoryEmpty.hidden = false;
            clearIdlePromptTimer();
            hidePrompt();
            return;
          }
          memoryEmpty.hidden = true;
          memoryCard.hidden = false;
          let next = pool[Math.floor(Math.random() * pool.length)];
          if (currentCard && pool.length > 1) {
            while (next.id === currentCard.id) {
              next = pool[Math.floor(Math.random() * pool.length)];
            }
          }
          transitionToCard(next, animate);
        }

        function renderConnectRound(day) {
          if (!connectGrid || !connectPrompt) {
            return;
          }
          const pool = getPlayableCards(day);
          if (!pool.length) {
            currentCard = null;
            connectGrid.innerHTML = '';
            connectPrompt.textContent = 'Nenhum flashcard disponível.';
            return;
          }
          const stats = loadFlashcardStats();
          const choices = pickRandomCards(pool, Math.min(CONNECT_CHOICES, pool.length), new Set(), stats);
          if (!choices.length) {
            currentCard = null;
            connectGrid.innerHTML = '';
            connectPrompt.textContent = 'Nenhum flashcard disponível.';
            return;
          }
          const target = choices[Math.floor(Math.random() * choices.length)];
          currentCard = target;
          markCardPlayed(target);
          connectPrompt.textContent = 'Ouça e toque na imagem certa.';
          connectGrid.innerHTML = '';
          choices.forEach(choice => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'connect-option';
            button.dataset.cardId = choice.id;
            const img = document.createElement('img');
            img.src = choice.imageSrc;
            img.alt = choice.nomePortugues || 'Flashcard';
            const label = document.createElement('span');
            label.textContent = choice.nomePortugues || 'Flashcard';
            button.appendChild(img);
            button.appendChild(label);
            button.addEventListener('click', () => {
              if (!currentCard) return;
              const wasCorrect = choice.id === currentCard.id;
              recordFlashcardMetric(currentCard, 'association', wasCorrect ? 100 : 0);
              connectPrompt.textContent = wasCorrect ? 'Correto!' : 'Tente novamente.';
              window.setTimeout(() => {
                renderConnectRound(day);
              }, 800);
            });
            connectGrid.appendChild(button);
          });
          playPronunciation(target);
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

        function clearIdlePromptTimer() {
          if (idlePromptTimer) {
            window.clearTimeout(idlePromptTimer);
            idlePromptTimer = null;
          }
        }

        function showPrompt(text) {
          memoryPrompt.textContent = text;
          memoryPrompt.classList.add('is-visible');
        }

        function hidePrompt() {
          memoryPrompt.classList.remove('is-visible');
        }

        function scheduleIdlePrompt(text = 'Speak now', { showNow = false } = {}) {
          clearIdlePromptTimer();
          memoryPrompt.textContent = text;
          if (showNow) {
            memoryPrompt.classList.add('is-visible');
          } else {
            hidePrompt();
          }
          idlePromptTimer = window.setTimeout(() => {
            if (isListening) return;
            showPrompt('Toque e Fale');
          }, PROMPT_IDLE_DELAY);
        }

        async function handleSpeechAttempt(day) {
          if (!currentCard || isListening || currentMode === 'association') return;
          clearIdlePromptTimer();
          isListening = true;
          try {
            await ensureMicrophoneAccess();
            if (currentMode === 'memory') {
              const statsBefore = loadFlashcardStats();
              const key = getFlashcardKey(currentCard);
              const entryBefore = key ? ensureStatsEntry(statsBefore, key) : null;
              const prevStreak = getMemoryStreak(entryBefore);
              const shouldPreviewAudio = prevStreak === 0;
              if (shouldPreviewAudio) {
                showPrompt('Listen');
                await playPronunciation(currentCard);
              }
              showPrompt('Speak now');
              const spoken = await listenForSpeech();
              const percent = Math.round(calculateSequenceMatchPercent(currentCard.nomeIngles || '', spoken));
              const wasCorrect = percent >= 80;
              const outcome = recordMemoryAttempt(currentCard, wasCorrect);
              updatePronunciationStats(currentCard, percent);
              const stats = loadFlashcardStats();
              const entry = key ? ensureStatsEntry(stats, key) : null;
              if (entry) {
                setMemoryBackground(getMemoryBackground(entry));
              }
              updateAccuracyLens(currentCard);
              const gainedStar = wasCorrect && prevStreak < MEMORY_STAR_COUNT;
              if (gainedStar) {
                if (!outcome.seeded) {
                  playEffectSound(MEMORY_EFFECT_SOUNDS.star);
                }
              }
              if (wasCorrect && outcome.seeded) {
                const dayCards = getDayCards(day);
                updateDeckForSeeding(day, dayCards, stats, [currentCard.id]);
                holdSeedingBackground = true;
                playEffectSound(MEMORY_EFFECT_SOUNDS.seeding);
                dissolveMemoryBackground(MEMORY_SEEDING_BACKGROUND, SEEDING_DISSOLVE_DURATION);
              }
              if (!wasCorrect) {
                await animateStarLoss(prevStreak);
              } else {
                renderStars(entry);
              }
              if (!shouldPreviewAudio) {
                await playPronunciation(currentCard);
              }
              const delay = wasCorrect && outcome.seeded ? SEEDING_DISSOLVE_DURATION : 0;
              window.setTimeout(() => {
                pickNextCard(day, true);
              }, delay);
              return;
            }
            const spoken = await listenForSpeech();
            const percent = Math.round(calculateSequenceMatchPercent(currentCard.nomeIngles || '', spoken));
            updatePronunciationStats(currentCard, percent);
            if (currentMode === 'listening') {
              recordFlashcardMetric(currentCard, 'listening', percent);
            }
            if (currentMode === 'reading') {
              recordFlashcardMetric(currentCard, 'reading', percent);
            }
            updateAccuracyLens(currentCard);
            pickNextCard(day, true);
          } finally {
            hidePrompt();
            isListening = false;
          }
        }

        async function initialize() {
          const day = getDayFromQuery();
          if (memoryLevelLabel) {
            memoryLevelLabel.textContent = `Dia ${day}`;
          }
          setupSpeechRecognition();
          await loadMirrorGroups();
          await loadFlashcards();
          if (memoryCard) {
            memoryCard.addEventListener('pointerdown', event => {
              if (swipePointerId !== null) return;
              swipePointerId = event.pointerId;
              swipeStartX = event.clientX;
              swipeStartY = event.clientY;
              swipeDeltaX = 0;
              isSwiping = false;
              memoryCard.classList.remove('memory-card--dismissed', 'memory-card--dismissed-left', 'memory-card--dismissed-right');
              memoryCard.setPointerCapture(event.pointerId);
            });
            memoryCard.addEventListener('pointermove', event => {
              if (swipePointerId !== event.pointerId) return;
              swipeDeltaX = event.clientX - swipeStartX;
              const deltaY = event.clientY - swipeStartY;
              if (!isSwiping) {
                if (Math.abs(swipeDeltaX) < SWIPE_ACTIVATION_DISTANCE || Math.abs(swipeDeltaX) < Math.abs(deltaY)) {
                  return;
                }
                isSwiping = true;
                memoryCard.classList.add('memory-card--dragging');
              }
              if (isSwiping) {
                memoryCard.style.transform = `translateX(${swipeDeltaX}px)`;
              }
            });
            memoryCard.addEventListener('pointerup', event => {
              if (swipePointerId !== event.pointerId) return;
              memoryCard.releasePointerCapture(event.pointerId);
              memoryCard.classList.remove('memory-card--dragging');
              const shouldDismiss = isSwiping && Math.abs(swipeDeltaX) >= SWIPE_DISMISS_DISTANCE;
              if (shouldDismiss && currentCard) {
                const directionClass = swipeDeltaX < 0 ? 'memory-card--dismissed-left' : 'memory-card--dismissed-right';
                memoryCard.classList.add('memory-card--dismissed', directionClass);
                snoozeCard(currentCard);
                window.setTimeout(() => {
                  memoryCard.style.transform = '';
                  memoryCard.classList.remove('memory-card--dismissed', 'memory-card--dismissed-left', 'memory-card--dismissed-right');
                  if (currentMode === 'memory') {
                    refreshAvailableCards(day);
                  }
                  pickNextCard(day, true);
                }, 300);
              } else {
                memoryCard.style.transform = '';
                handleSpeechAttempt(day);
              }
              swipePointerId = null;
              isSwiping = false;
            });
            memoryCard.addEventListener('pointercancel', event => {
              if (swipePointerId !== event.pointerId) return;
              memoryCard.style.transform = '';
              memoryCard.classList.remove('memory-card--dragging');
              swipePointerId = null;
              isSwiping = false;
            });
          }

          const storedMode = getStoredMode();
          setMode(storedMode);

          const startGame = (mode) => {
            setMode(mode);
            if (playModeMenu) {
              playModeMenu.style.display = 'none';
            }
            if (currentMode === 'memory') {
              refreshAvailableCards(day);
            }
            pickNextCard(day);
          };

          if (modeButtons.length) {
            modeButtons.forEach(button => {
              button.addEventListener('click', () => {
                const mode = button.dataset.playMode;
                if (mode) {
                  startGame(mode);
                }
              });
            });
          } else {
            startGame(storedMode);
          }
        }

        initialize();
  };

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-play', initPlayPage);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayPage, { once: true });
  } else {
    initPlayPage();
  }
})();
