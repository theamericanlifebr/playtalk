(function () {
  const STORAGE_KEY = 'vocabulary-level';
  const board = document.getElementById('board');
  const boardInner = document.getElementById('board-inner');
  const textContainer = document.getElementById('text-container');
  const choiceRow = document.getElementById('choice-row');
  const progressFill = document.getElementById('progress-fill');
  const phaseLabel = document.getElementById('phase-label');
  const levelBadge = document.getElementById('level-indicator');
  const startScreen = document.getElementById('start-screen');
  const rotatingText = document.getElementById('rotating-text');
  const levelComplete = document.getElementById('level-complete');
  const levelCompleteText = document.getElementById('level-complete-text');
  const levelCountdown = document.getElementById('level-countdown');
  const nextLevelBtn = document.getElementById('next-level-btn');
  const replayLevelBtn = document.getElementById('replay-level-btn');
  const phaseTransition = document.getElementById('phase-transition');
  const phaseTransitionTitle = document.getElementById('phase-transition-title');
  const phaseTransitionBtn = document.getElementById('phase-transition-btn');
  const progressCompleteOverlay = document.getElementById('progress-complete-overlay');
  const finalOverlay = document.getElementById('final-overlay');
  const finalTotalTimeEl = document.getElementById('final-total-time');
  const finalPronunciationEl = document.getElementById('final-pronunciation');
  const finalProgressBar = document.getElementById('final-progress-bar');
  const finalProgressFill = document.getElementById('final-progress-fill');
  const finalMedalImage = document.getElementById('final-medal-image');
  const finalMedalLabel = document.getElementById('final-medal-label');
  const gameMedalIcon = document.getElementById('game-medal-icon');
  const gameMedalLabel = document.getElementById('game-medal-label');
  const heartNodes = Array.from(document.querySelectorAll('.game-heart'));
  const phaseAudioProgress = document.getElementById('phase-audio-progress');
  const phaseAudioProgressFill = document.getElementById('phase-audio-progress-fill');
  const phaseAudioSkip = document.getElementById('phase-audio-skip');
  const PHASE_DISSOLVE_MS = 500;
  const IMAGE_DISSOLVE_MS = 500;
  const PHASE_FOUR_BATCH_SIZE = 6;
  const PHASE_FOUR_GREEN_MS = 1000;
  const PHASE_FOUR_DISSOLVE_MS = 1000;
  const AUDIO_SKIP_TAP_COUNT = 5;
  const MEDAL_STORAGE_KEY = 'vocabulary-medals';
  const PROGRESS_STORAGE_KEY = 'vocabulary-progress';
  const COMPLETION_STORAGE_KEY = 'vocabulary-last-complete';
  const LEVEL_TIME_STORAGE_KEY = 'vocabulary-level-times';
  const MEDAL_RANKING = { bronze: 0, prata: 1, ouro: 2, diamante: 3 };
  const MEDAL_HEARTS = {
    diamante: 5,
    ouro: 3,
    prata: 3,
    bronze: 0
  };
  const MEDAL_DOWNGRADE = {
    diamante: 'ouro',
    ouro: 'prata',
    prata: 'bronze',
    bronze: 'bronze'
  };
  const MIRROR_PATH = 'data/mirror.json';
  const AUDIO_LEVELS_PATH = 'data/audiosniveis.json';
  const AUDIO_LISTENED_STORAGE_KEY = 'playtalk-phase-audio-listened';
  const AUDIO_RESOLVE_ENDPOINT = '/api/media/resolve';
  const successAudio = document.getElementById('audio-success');
  const errorAudio = document.getElementById('audio-error');
  const conclusionAudio = document.getElementById('audio-conclusao');
  const micAudio = document.getElementById('audio-mic');
  const MIC_PROMPT_STORAGE_KEY = 'vocabulary-mic-prompted';
  const PHASE_THREE_HINT_STORAGE_KEY = 'vocabulary-phase3-mic-hint';
  const LEVEL_TWO_UNLOCK_STORAGE_KEY = 'vocabulary-level2-unlock-at';
  const LEVEL_TWO_UNLOCK_HOUR = 6;

  let images = [];
  let buildingImages = [];
  let level = 1;
  let phase = 1;
  let pool = [];
  let cycle = [];
  let index = 0; // posição atual no ciclo
  let score = 0; // progresso / acertos
  let currentItem = null;
  let completionGridShown = false;
  let phaseFourBatchStart = 0;
  let phaseFourBatch = [];
  let phaseFourExpectedIndex = 0;
  let phaseFourResolved = 0;
  let phaseFourAudioPlaying = false;
  let audioLevelsConfig = null;
  let audioLevelsPromise = null;
  const resolvedAudioCache = new Map();

  let awaiting = false;
  let recognition = null;
  let loadPromise = null;
  let buildingLoadPromise = null;
  let fileLevels = new Map();
  let rotationTimer = null;
  let rotationIndex = 0;
  let gameStarted = false;
  let errorStreak = 0;
  let attemptCount = 0;
  let totalErrors = 0;
  let currentMedalKey = 'diamante';
  let heartsRemaining = MEDAL_HEARTS.diamante;
  let completedLevelSnapshot = null;
  let levelStartTime = 0;
  let levelElapsedBase = 0;
  let mirrorGroups = [];
  let pronunciationSamples = [];
  let micPromptTimer = null;
  let levelUnlockTimer = null;
  const ROTATION_FADE_MS = 400;
  const SUPPORTED_ENTRY_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.opus', '.ogg', '.webm'];
  const audioElementCache = new Map();
  const FINAL_ADVANCE_DELAY_MS = 1500;
  const TENSE_STYLES = {
    'present-continuous': {
      ring: 'conic-gradient(#f78c1f, #3f8cff, #f6c453, #f78c1f)',
      animation: 'spin 3s linear infinite'
    },
    'present-perfect': {
      ring: 'conic-gradient(#14245a, #6b4bbf, #a2ff5f, #14245a)',
      animation: 'spin 3s linear infinite',
      filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) saturate(0.6) brightness(1.05)'
    },
    'present-perfect-continuous': {
      ring: 'conic-gradient(#f78c1f, #3f8cff, #f6c453, #f78c1f)',
      animation: 'spin 3s linear infinite'
    },
    'past-simple': {
      ring: 'conic-gradient(#8d939e, #c6c9d0, #8d939e)',
      filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) saturate(0.5) brightness(1.06)'
    },
    'past-continuous': {
      ring: 'conic-gradient(#f78c1f, #3f8cff, #f6c453, #f78c1f)',
      animation: 'spin 3s linear infinite',
      filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) saturate(0.55) brightness(1.05)'
    },
    'past-perfect': {
      ring: 'conic-gradient(#c46a2c, #1b2b5a, #6b4b2a, #2f2f38, #c46a2c)',
      animation: 'spin 8s linear infinite',
      filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) saturate(0.5) brightness(1.02) blur(1px)'
    },
    'past-perfect-continuous': {
      ring: 'conic-gradient(#f78c1f, #3f8cff, #f6c453, #f78c1f)',
      animation: 'spin 3s linear infinite',
      filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) saturate(0.5) brightness(1.03) blur(0.6px)'
    },
    'future-simple': {
      ring: 'conic-gradient(#5a4ba6, #1c2f6b, #5a4ba6)',
      mask: 'linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.6) 100%)'
    },
    'future-continuous': {
      ring: 'conic-gradient(#5ed0ff, #36e07a, #5ed0ff)',
      animation: 'spin 4s linear infinite',
      glow: '0 0 14px rgba(94, 208, 255, 0.35)'
    },
    'future-perfect': {
      ring: 'conic-gradient(#f6c453, #123b7d, #f6c453)',
      animation: 'spin 6s linear infinite',
      glow: '0 0 12px rgba(246, 196, 83, 0.28)'
    },
    'future-perfect-continuous': {
      ring: 'conic-gradient(#f6c453, #123b7d, #f6c453)',
      animation: 'spin 6s linear infinite',
      glow: '0 0 12px rgba(246, 196, 83, 0.28)'
    },
    'going-to-future': {
      ring: 'conic-gradient(#1c2f6b, #5a4ba6, #1c2f6b)',
      animation: 'spin 5s linear infinite',
      mask: 'linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.6) 100%)'
    },
    'present-continuous-future': {
      ring: 'conic-gradient(#f78c1f, #3f8cff, #f6c453, #f78c1f)',
      animation: 'spin-partial 3s linear infinite'
    },
    'present-simple-future': {
      ring: 'conic-gradient(#1b2b5a, #1b2b5a)'
    },
    'conditional-would': {
      lens: 'linear-gradient(40deg, rgba(90, 150, 255, 0.75) 0%, rgba(90, 150, 255, 0) 60%)'
    }
  };
  const SENTENCE_FORM_STYLES = {
    affirmative: {
      ring: 'conic-gradient(#29d67b, #7df0ad, #29d67b)',
      lens: 'linear-gradient(to top, rgba(41, 214, 123, 0.75) 0%, rgba(41, 214, 123, 0) 60%)'
    },
    negative: {
      ring: 'conic-gradient(#ff4d4f, #ff8a8b, #ff4d4f)',
      lens: 'linear-gradient(to top, rgba(255, 77, 79, 0.75) 0%, rgba(255, 77, 79, 0) 60%)'
    },
    question: {
      ring: 'conic-gradient(#e0711d, #f6b25e, #e0711d)',
      animation: 'swing 1.5s ease-in-out infinite',
      lens: 'linear-gradient(to top, rgba(246, 178, 94, 0.75) 0%, rgba(246, 178, 94, 0) 60%)'
    },
    imperative: {
      ring: 'conic-gradient(#f6c453, #f2a80b, #f6c453)',
      animation: 'spin 2s linear infinite',
      lens: 'linear-gradient(to top, rgba(246, 196, 83, 0.75) 0%, rgba(246, 196, 83, 0) 60%)'
    }
  };

  function normalizeImageEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;

    const file = entry.file || entry.imagem;
    const en = entry.en || entry.nomeIngles;
    const pt = entry.pt || entry.nomePortugues;
    const audio = typeof entry.audio === 'string' ? entry.audio : '';

    if (!file || !en) return null;

    return {
      ...entry,
      file,
      en,
      pt: pt || entry.pt || '',
      audio
    };
  }

  function hasSupportedAudioExtension(fileName = '') {
    const lower = fileName.toLowerCase();
    return SUPPORTED_ENTRY_AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
  }

  function buildAudioSrc(entry) {
    const audioName = typeof entry?.audio === 'string' ? entry.audio.trim() : '';
    if (!audioName || !hasSupportedAudioExtension(audioName)) return '';

    const sanitized = audioName.replace(/^[/\\]+/, '');
    const hasVoicesPrefix = sanitized.toLowerCase().startsWith('voices/');
    const encodedPath = sanitized
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');

    return hasVoicesPrefix ? encodedPath : `voices/${encodedPath}`;
  }

  function isWebpFile(fileName) {
    return typeof fileName === 'string' && fileName.trim().toLowerCase().endsWith('.webp');
  }

  function applyImageStyling(img, fileName) {
    if (!img) return;
    if (isWebpFile(fileName)) {
      img.classList.add('image--webp');
    }
  }

  function applyVisualStyles(wrapper, entry = {}) {
    if (!wrapper) return;
    const tenseStyle = TENSE_STYLES[entry.tense] || {};
    const formStyle = SENTENCE_FORM_STYLES[entry.sentenceForm] || {};

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

  function buildVisualWrapper(entry, img, options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = `image-visual${options.fill ? ' image-visual--fill' : ''}`;
    applyVisualStyles(wrapper, entry);

    const tenseRing = document.createElement('div');
    tenseRing.className = 'image-ring image-ring--tense';
    const formRing = document.createElement('div');
    formRing.className = 'image-ring image-ring--form';
    const tenseLens = document.createElement('div');
    tenseLens.className = 'image-lens image-lens--tense';
    const formLens = document.createElement('div');
    formLens.className = 'image-lens image-lens--form';

    wrapper.appendChild(tenseRing);
    wrapper.appendChild(formRing);
    wrapper.appendChild(tenseLens);
    wrapper.appendChild(formLens);
    wrapper.appendChild(img);
    return wrapper;
  }

  function createEntryImage(entry, className, options = {}) {
    const img = document.createElement('img');
    img.src = buildImageSrc(entry);
    img.alt = entry.en;
    img.className = className;
    applyImageStyling(img, entry.file);
    return buildVisualWrapper(entry, img, options);
  }

  function scheduleButtonTextFit(button, minSize = 14) {
    if (!button) return;
    const resize = () => {
      const computed = window.getComputedStyle(button);
      const baseSize = Number.parseFloat(computed.fontSize) || 0;
      if (!baseSize) return;
      let size = baseSize;
      button.style.fontSize = `${size}px`;
      while (button.scrollWidth > button.clientWidth && size > minSize) {
        size -= 1;
        button.style.fontSize = `${size}px`;
      }
    };
    window.requestAnimationFrame(resize);
  }

  function playAudioElement(audio, options = {}) {
    return new Promise(resolve => {
      if (!audio) {
        resolve(false);
        return;
      }

      let hasPlayed = false;
      let cleanupSkip = null;
      const { allowSkip = false, onSkip } = options;

      const markPlayed = () => {
        hasPlayed = true;
      };

      const finish = () => {
        audio.removeEventListener('playing', markPlayed);
        audio.removeEventListener('ended', finish);
        audio.removeEventListener('error', finish);
        if (cleanupSkip) cleanupSkip();
        resolve(hasPlayed);
      };

      const handleSkip = () => {
        audio.pause();
        audio.currentTime = 0;
        if (typeof onSkip === 'function') {
          onSkip();
        }
        finish();
      };

      audio.currentTime = 0;
      audio.addEventListener('playing', markPlayed);
      audio.addEventListener('ended', finish);
      audio.addEventListener('error', finish);
      cleanupSkip = allowSkip ? createTapSkipListener(handleSkip) : null;

      const playResult = audio.play();
      if (playResult && typeof playResult.then === 'function') {
        playResult
          .then(() => { hasPlayed = true; })
          .catch(finish);
      } else {
        hasPlayed = true;
      }
    });
  }

  function getAdvanceDelay(defaultDelayMs) {
    return index >= cycle.length ? FINAL_ADVANCE_DELAY_MS : defaultDelayMs;
  }

  function getLevelTwoUnlockAt() {
    const stored = Number(localStorage.getItem(LEVEL_TWO_UNLOCK_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  }

  function setNextLevelTwoUnlockAt() {
    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + 1);
    unlockDate.setHours(LEVEL_TWO_UNLOCK_HOUR, 0, 0, 0);
    const timestamp = unlockDate.getTime();
    localStorage.setItem(LEVEL_TWO_UNLOCK_STORAGE_KEY, String(timestamp));
    return timestamp;
  }

  function isLevelTwoLocked() {
    const unlockAt = getLevelTwoUnlockAt();
    return unlockAt ? Date.now() < unlockAt : false;
  }

  function clearLevelUnlockTimer() {
    if (levelUnlockTimer) {
      clearInterval(levelUnlockTimer);
      levelUnlockTimer = null;
    }
  }

  function formatCountdownTime(remainingMs) {
    const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
  }

  function resetPhaseAudioProgress() {
    if (!phaseAudioProgress || !phaseAudioProgressFill) return;
    phaseAudioProgressFill.style.width = '0%';
    phaseAudioProgress.setAttribute('aria-valuenow', '0');
  }

  function trackPhaseAudioProgress(audio) {
    if (!phaseAudioProgress || !phaseAudioProgressFill || !audio) {
      return () => {};
    }

    const updateProgress = () => {
      const duration = audio.duration;
      const percent = duration ? Math.min(100, (audio.currentTime / duration) * 100) : 0;
      phaseAudioProgressFill.style.width = `${percent}%`;
      phaseAudioProgress.setAttribute('aria-valuenow', String(Math.round(percent)));
    };

    const finalizeProgress = () => {
      updateProgress();
      if (!audio.duration || Number.isNaN(audio.duration)) {
        phaseAudioProgressFill.style.width = '100%';
        phaseAudioProgress.setAttribute('aria-valuenow', '100');
      }
    };

    resetPhaseAudioProgress();
    updateProgress();

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', finalizeProgress);
    audio.addEventListener('error', finalizeProgress);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('ended', finalizeProgress);
      audio.removeEventListener('error', finalizeProgress);
    };
  }

  function loadLevelFromStorage() {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) {
      level = stored;
    } else {
      level = 1;
    }
    if (level >= 2 && isLevelTwoLocked()) {
      level = 1;
    }
    updateLevelIndicators();
  }

  function saveLevelToStorage() {
    localStorage.setItem(STORAGE_KEY, String(level));
  }

  function updateLevelIndicators() {
    if (levelBadge) levelBadge.textContent = `Dia ${level}`;
  }

  function updatePhaseLabel() {
    if (phaseLabel) phaseLabel.textContent = `Fase ${phase}`;
    if (document.body) {
      for (let i = 1; i <= 7; i += 1) {
        document.body.classList.toggle(`phase-${i}`, phase === i);
      }
    }
  }

  function readMedalStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(MEDAL_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveMedalStorage(data) {
    localStorage.setItem(MEDAL_STORAGE_KEY, JSON.stringify(data));
  }

  function readProgressStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveProgressStorage(data) {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
  }

  function clearProgressStorage() {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  }

  function readCompletionStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(COMPLETION_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveCompletionStorage(data) {
    localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(data));
  }

  function readAudioListenedStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(AUDIO_LISTENED_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveAudioListenedStorage(data) {
    localStorage.setItem(AUDIO_LISTENED_STORAGE_KEY, JSON.stringify(data));
  }

  function getPhaseAudioStorageKey(day, phaseNumber) {
    return `day-${day}-phase-${phaseNumber}`;
  }

  function hasListenedPhaseAudio(day, phaseNumber) {
    const storage = readAudioListenedStorage();
    return Boolean(storage[getPhaseAudioStorageKey(day, phaseNumber)]);
  }

  function markPhaseAudioListened(day, phaseNumber) {
    const storage = readAudioListenedStorage();
    storage[getPhaseAudioStorageKey(day, phaseNumber)] = true;
    saveAudioListenedStorage(storage);
  }

  function loadAudioLevelsConfig() {
    if (audioLevelsConfig) return Promise.resolve(audioLevelsConfig);
    if (audioLevelsPromise) return audioLevelsPromise;
    audioLevelsPromise = fetch(AUDIO_LEVELS_PATH)
      .then(response => (response.ok ? response.json() : {}))
      .catch(() => ({}))
      .then(data => {
        audioLevelsConfig = data && typeof data === 'object' ? data : {};
        return audioLevelsConfig;
      });
    return audioLevelsPromise;
  }

  function getDayAudioConfig(dayNumber) {
    if (!audioLevelsConfig || typeof audioLevelsConfig !== 'object') return {};
    const days = audioLevelsConfig.days && typeof audioLevelsConfig.days === 'object' ? audioLevelsConfig.days : {};
    return days[String(dayNumber)] || {};
  }

  function getPhaseAudioName(dayNumber, phaseNumber) {
    const dayConfig = getDayAudioConfig(dayNumber);
    const phases = dayConfig.phases && typeof dayConfig.phases === 'object' ? dayConfig.phases : {};
    const audioName = phases[String(phaseNumber)];
    return typeof audioName === 'string' ? audioName.trim() : '';
  }

  function getPostGameAudioName(dayNumber) {
    const dayConfig = getDayAudioConfig(dayNumber);
    const audioName = dayConfig.postGame;
    return typeof audioName === 'string' ? audioName.trim() : '';
  }

  async function resolveMediaUrl(fileName) {
    const trimmed = typeof fileName === 'string' ? fileName.trim() : '';
    if (!trimmed) return '';
    if (resolvedAudioCache.has(trimmed)) {
      return resolvedAudioCache.get(trimmed) || '';
    }
    try {
      const response = await fetch(`${AUDIO_RESOLVE_ENDPOINT}?name=${encodeURIComponent(trimmed)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.success && typeof data.url === 'string') {
          resolvedAudioCache.set(trimmed, data.url);
          return data.url;
        }
      }
    } catch (error) {
      // ignore and fallback
    }
    const fallbackPath = trimmed
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
    resolvedAudioCache.set(trimmed, `gamesounds/${fallbackPath}`);
    return `gamesounds/${fallbackPath}`;
  }

  async function getAudioElementFromName(fileName) {
    const src = await resolveMediaUrl(fileName);
    if (!src) return null;
    return getCachedAudioElement(src);
  }

  function clearCompletionStorage() {
    localStorage.removeItem(COMPLETION_STORAGE_KEY);
  }

  function readLevelTimeStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(LEVEL_TIME_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveLevelTimeStorage(data) {
    localStorage.setItem(LEVEL_TIME_STORAGE_KEY, JSON.stringify(data));
  }

  function updateLevelBestTime(levelNumber, elapsedMs) {
    if (!Number.isFinite(levelNumber) || levelNumber <= 0) return;
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
    const storage = readLevelTimeStorage();
    const key = String(levelNumber);
    const existing = Number(storage[key]);
    if (!Number.isFinite(existing) || elapsedMs < existing) {
      storage[key] = Math.round(elapsedMs);
      saveLevelTimeStorage(storage);
    }
  }

  function startLevelTimer() {
    levelElapsedBase = 0;
    levelStartTime = Date.now();
  }

  function pauseLevelTimer() {
    if (!levelStartTime) return;
    levelElapsedBase += Math.max(0, Date.now() - levelStartTime);
    levelStartTime = 0;
  }

  function resumePausedLevelTimer() {
    if (levelStartTime) return;
    levelStartTime = Date.now();
  }

  function resumeLevelTimer(elapsedMs) {
    levelElapsedBase = Math.max(0, Math.floor(Number(elapsedMs) || 0));
    levelStartTime = Date.now();
  }

  function getLevelElapsedMs() {
    if (!levelStartTime) {
      return levelElapsedBase;
    }
    return levelElapsedBase + Math.max(0, Date.now() - levelStartTime);
  }

  function resetLevelTimer() {
    levelElapsedBase = 0;
    levelStartTime = 0;
  }

  function formatElapsedTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function getPronunciationAverage() {
    if (!pronunciationSamples.length) return 0;
    const sum = pronunciationSamples.reduce((total, value) => total + value, 0);
    return sum / pronunciationSamples.length;
  }

  function getMedalForErrors(errorCount) {
    if (errorCount >= 7) return 'prata';
    if (errorCount >= 4) return 'ouro';
    return 'diamante';
  }

  function getMedalImage(medalKey) {
    switch (medalKey) {
      case 'bronze':
        return 'medalhas/bronze.png';
      case 'ouro':
        return 'medalhas/ouro.png';
      case 'prata':
        return 'medalhas/prata.png';
      case 'diamante':
      default:
        return 'medalhas/diamante.png';
    }
  }

  function updateMedalHud(medalKey) {
    const label = medalKey ? medalKey.charAt(0).toUpperCase() + medalKey.slice(1) : '';
    if (gameMedalIcon) gameMedalIcon.src = getMedalImage(medalKey);
    if (gameMedalIcon) gameMedalIcon.alt = `Medalha ${medalKey}`;
    if (gameMedalLabel) gameMedalLabel.textContent = label;
  }

  function updateFinalMedal(medalKey) {
    const label = medalKey ? medalKey.charAt(0).toUpperCase() + medalKey.slice(1) : '';
    if (finalMedalImage) finalMedalImage.src = getMedalImage(medalKey);
    if (finalMedalImage) finalMedalImage.alt = `Medalha ${medalKey}`;
    if (finalMedalLabel) finalMedalLabel.textContent = label;
  }

  function getHeartsTotal(medalKey) {
    return MEDAL_HEARTS[medalKey] ?? MEDAL_HEARTS.diamante;
  }

  function normalizeMedalKey(medalKey) {
    return MEDAL_HEARTS[medalKey] ? medalKey : 'diamante';
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

  function isSpokenCorrect(expected, spoken) {
    const percent = calculateSequenceMatchPercent(expected, spoken);
    pronunciationSamples.push(percent);
    return percent >= 50;
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

  function getHeartsRemaining(errorCount) {
    const totalHearts = 5;
    return Math.max(0, totalHearts - errorCount);
  }

  function updateHeartsDisplay() {
    const total = getHeartsTotal(currentMedalKey);
    const remaining = Math.min(Math.max(heartsRemaining, 0), total);
    heartNodes.forEach((node, idx) => {
      node.classList.toggle('game-heart--lost', idx >= total || idx >= remaining);
    });
  }

  function registerMedalResult(levelNumber, medalKey) {
    const levelKey = String(levelNumber);
    const storage = readMedalStorage();
    const existing = storage[levelKey];
    const nextRank = MEDAL_RANKING[medalKey] || 0;
    const currentRank = MEDAL_RANKING[existing] || 0;
    if (!existing || nextRank > currentRank) {
      storage[levelKey] = medalKey;
      saveMedalStorage(storage);
    }
  }

  function applyBoardSizing(targetPhase) {
    if (!board || !textContainer || !choiceRow) return;
    const shouldExpand = targetPhase === 4;
    const isCompact = targetPhase === 1 || targetPhase === 3 || targetPhase === 5 || targetPhase === 6 || targetPhase === 7;
    board.classList.toggle('board--expanded', shouldExpand);
    board.classList.toggle('board--compact', isCompact);
    textContainer.classList.toggle('text-container--compact', isCompact);
    choiceRow.classList.toggle('choice-row--compact', isCompact);
  }

  function splitPhaseSevenText(message, maxLength = 20) {
    const trimmed = message.trim();
    if (trimmed.length <= maxLength) return [message];
    const midpoint = Math.floor(trimmed.length / 2);
    let splitIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < trimmed.length; i += 1) {
      if (trimmed[i] !== ' ') continue;
      const distance = Math.abs(i - midpoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        splitIndex = i;
      }
    }

    if (splitIndex === -1) {
      splitIndex = midpoint;
    }

    const line1 = trimmed.slice(0, splitIndex).trimEnd();
    const line2 = trimmed.slice(trimmed[splitIndex] === ' ' ? splitIndex + 1 : splitIndex).trimStart();
    return [line1, line2].filter(Boolean);
  }

  async function loadStandardImages() {
    if (loadPromise) return loadPromise;
    const imagesPromise = fetch('images/images.json').then(response => (
      response.ok ? response.json() : []
    ));
    const levelsPromise = fetch('/api/image-levels').then(response => (
      response.ok ? response.json() : {}
    ));

    loadPromise = Promise.all([imagesPromise, levelsPromise])
      .then(([data, levelResponse]) => {
        images = Array.isArray(data)
          ? data.map(normalizeImageEntry).filter(Boolean)
          : [];

        const levelEntries = levelResponse && typeof levelResponse === 'object'
          ? levelResponse.levels || {}
          : {};

        fileLevels = new Map(
          Object.entries(levelEntries).map(([fileName, value]) => [fileName, Number(value)])
        );

        filterPool();
        resetProgress();
      })
      .catch(() => {
        images = [];
        pool = [];
        fileLevels = new Map();
      });
    return loadPromise;
  }

  async function loadBuildingImages() {
    if (buildingLoadPromise) return buildingLoadPromise;
    buildingLoadPromise = fetch('images/building.json')
      .then(response => (response.ok ? response.json() : []))
      .then(data => {
        buildingImages = Array.isArray(data)
          ? data.map(normalizeImageEntry).filter(Boolean)
          : [];
      })
      .catch(() => {
        buildingImages = [];
      });

    return buildingLoadPromise;
  }

  function loadAllImages() {
    return Promise.all([loadStandardImages(), loadBuildingImages(), loadMirrorGroups()]);
  }

  function buildImageSrc(entry) {
    const fileName = entry?.file;
    if (!fileName) return '';
    const encodedPath = fileName
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
    return `images/${encodedPath}`;
  }

  function getItemLevel(entry) {
    const levelValue = fileLevels.get(entry?.file);
    return Number.isFinite(levelValue) ? levelValue : 0;
  }

  function filterPool() {
    if (phase === 7) {
      const numericLevel = Math.max(1, Number(level) || 1);
      pool = buildingImages.filter(entry => {
        const categoryValue = entry?.categoria ?? entry?.category ?? entry?.folder;
        const categoryNumber = Number(categoryValue);
        if (categoryNumber === 1) return numericLevel === 1;
        if (categoryNumber === 2) return numericLevel === 2;
        return true;
      });
      return;
    }

    const numericLevel = Math.max(1, Number(level) || 1);
    pool = images.filter(item => getItemLevel(item) === numericLevel);
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function resetProgress() {
    index = 0;
    score = 0;
    errorStreak = 0;
    attemptCount = 0;
    currentItem = null;
    completionGridShown = false;
    cycle = shuffle(pool);
    phaseFourBatchStart = 0;
    phaseFourBatch = [];
    phaseFourExpectedIndex = 0;
    phaseFourResolved = 0;

    if (!cycle.length) {
      showText('Nenhuma imagem disponível para este dia.');
    }

    updateProgressBar();
  }

  function resetLevelState() {
    totalErrors = 0;
    currentMedalKey = 'diamante';
    heartsRemaining = getHeartsTotal(currentMedalKey);
    updateHeartsDisplay();
    updateMedalHud(currentMedalKey);
    updateFinalMedal(currentMedalKey);
    pronunciationSamples = [];
  }

  function updateProgressBar() {
    if (!progressFill) return;
    if (phase === 4) {
      const total = Math.max(phaseFourBatch.length, 1);
      const percent = Math.min(100, Math.round((phaseFourResolved / total) * 100));
      progressFill.style.width = `${percent}%`;
      persistProgressState();
      return;
    }
    const total = Math.max(cycle.length, 1);
    const percent = Math.min(100, Math.round((score / total) * 100));
    progressFill.style.width = `${percent}%`;
    persistProgressState();
  }

  function persistProgressState() {
    if (!gameStarted) return;
    saveProgressStorage({
      level,
      phase,
      index,
      score,
      errorStreak,
      attemptCount,
      totalErrors,
      medalKey: currentMedalKey,
      heartsRemaining,
      cycle: cycle.map(item => item.file),
      levelElapsedMs: getLevelElapsedMs(),
      phaseFour: phase === 4 ? {
        batchStart: phaseFourBatchStart,
        resolved: phaseFourResolved
      } : null
    });
  }

  function buildCycleFromFiles(files) {
    if (!Array.isArray(files) || !files.length) return [];
    const knownEntries = new Map(
      [...pool, ...images, ...buildingImages]
        .filter(entry => entry && entry.file)
        .map(entry => [entry.file, entry])
    );

    return files
      .map(file => knownEntries.get(file))
      .filter(Boolean);
  }

  function restoreProgressState() {
    const stored = readProgressStorage();
    if (!stored || !stored.level || !stored.phase || !Array.isArray(stored.cycle)) {
      return false;
    }

    level = stored.level;
    phase = stored.phase;
    index = Math.max(0, Number(stored.index) || 0);
    score = Math.max(0, Number(stored.score) || 0);
    errorStreak = Math.max(0, Number(stored.errorStreak) || 0);
    attemptCount = Math.max(0, Number(stored.attemptCount) || 0);
    totalErrors = Math.max(0, Number(stored.totalErrors) || 0);
    resumeLevelTimer(stored.levelElapsedMs);

    updateLevelIndicators();
    updatePhaseLabel();
    updateRecognitionLanguage(phase);
    applyBoardSizing(phase);
    filterPool();
    cycle = buildCycleFromFiles(stored.cycle);

    if (!cycle.length) {
      cycle = shuffle(pool);
    }

    const total = Math.max(cycle.length, 1);
    score = Math.min(score, total);
    index = Math.min(index, total);

    currentMedalKey = normalizeMedalKey(stored.medalKey || getMedalForErrors(totalErrors));
    const totalHearts = getHeartsTotal(currentMedalKey);
    heartsRemaining = Number.isFinite(stored.heartsRemaining)
      ? Math.min(Math.max(Number(stored.heartsRemaining), 0), totalHearts)
      : totalHearts;
    updateHeartsDisplay();
    updateMedalHud(currentMedalKey);
    updateFinalMedal(currentMedalKey);
    const phaseFourState = stored.phaseFour && typeof stored.phaseFour === 'object' ? stored.phaseFour : null;
    if (phase === 4) {
      const batchStart = Number.isFinite(phaseFourState?.batchStart) ? phaseFourState.batchStart : 0;
      const resolved = Number.isFinite(phaseFourState?.resolved) ? phaseFourState.resolved : 0;
      phaseFourBatchStart = Math.max(0, batchStart);
      phaseFourResolved = Math.max(0, resolved);
      phaseFourExpectedIndex = phaseFourResolved;
      phaseFourBatch = cycle.slice(phaseFourBatchStart, phaseFourBatchStart + PHASE_FOUR_BATCH_SIZE);
    }
    updateProgressBar();
    completionGridShown = false;
    awaiting = false;
    return true;
  }

  function resetProgressOnStreak() {
    errorStreak = 0;
    score = 0;
    index = 0;
    attemptCount = 0;
    cycle = shuffle(pool);
    phaseFourBatchStart = 0;
    phaseFourBatch = [];
    phaseFourExpectedIndex = 0;
    phaseFourResolved = 0;
  }

  function registerErrorAndCheckReset() {
    errorStreak += 1;
    totalErrors += 1;
    heartsRemaining = Math.max(0, heartsRemaining - 1);
    if (heartsRemaining === 0) {
      const nextMedal = MEDAL_DOWNGRADE[currentMedalKey] || 'bronze';
      if (nextMedal !== currentMedalKey) {
        currentMedalKey = nextMedal;
        heartsRemaining = getHeartsTotal(currentMedalKey);
        updateMedalHud(currentMedalKey);
        updateFinalMedal(currentMedalKey);
      }
    }
    updateHeartsDisplay();
    const shouldReset = errorStreak >= 3;
    if (shouldReset) {
      resetProgressOnStreak();
    }
    return shouldReset;
  }

  function registerAttemptAndCheckAutoCorrect() {
    attemptCount += 1;
    return false;
  }

  function applyCorrectOutcome() {
    errorStreak = 0;
    attemptCount = 0;
    score += 1;
    index += 1;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return Promise.resolve();
    return new Promise(resolve => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.95;
      utter.onend = resolve;
      utter.onerror = resolve;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    });
  }

  function createTapSkipListener(onSkip) {
    if (typeof onSkip !== 'function') return () => {};
    let taps = 0;

    const handleTap = () => {
      taps += 1;
      if (taps >= AUDIO_SKIP_TAP_COUNT) {
        cleanup();
        onSkip();
      }
    };

    const cleanup = () => {
      document.removeEventListener('pointerdown', handleTap);
    };

    document.addEventListener('pointerdown', handleTap);
    return cleanup;
  }

  function getCachedAudioElement(src) {
    if (!src) return null;
    const cached = audioElementCache.get(src) || new Audio(src);
    audioElementCache.set(src, cached);
    return cached;
  }

  function playAudioSource(src, options = {}) {
    if (!src) return Promise.reject(new Error('No audio source available'));

    return new Promise((resolve, reject) => {
      const { rate = 1, preservePitch = true, allowSkip = false, onSkip } = options;
      const cachedAudio = getCachedAudioElement(src);
      cachedAudio.pause();
      cachedAudio.currentTime = 0;
      cachedAudio.playbackRate = rate;
      if (preservePitch) {
        cachedAudio.preservesPitch = true;
        cachedAudio.mozPreservesPitch = true;
        cachedAudio.webkitPreservesPitch = true;
      }

      const cleanup = () => {
        cachedAudio.removeEventListener('ended', handleEnded);
        cachedAudio.removeEventListener('error', handleError);
        if (cleanupSkip) cleanupSkip();
      };

      const handleSkip = () => {
        cachedAudio.pause();
        cachedAudio.currentTime = 0;
        cleanup();
        if (typeof onSkip === 'function') {
          onSkip();
        }
        resolve(true);
      };

      const handleEnded = () => {
        cleanup();
        resolve(true);
      };

      const handleError = () => {
        cleanup();
        reject(new Error('Audio playback failed'));
      };

      cachedAudio.addEventListener('ended', handleEnded);
      cachedAudio.addEventListener('error', handleError);
      const cleanupSkip = allowSkip ? createTapSkipListener(handleSkip) : null;

      const playResult = cachedAudio.play();
      if (playResult && typeof playResult.then === 'function') {
        playResult.catch(handleError);
      }
    });
  }

  function playPronunciation(entry, options = {}) {
    const audioSrc = buildAudioSrc(entry);
    const text = typeof entry === 'string' ? entry : entry?.en || '';

    if (audioSrc) {
      return playAudioSource(audioSrc, options).catch(() => speak(text));
    }

    return speak(text);
  }

  function shouldShowMicPrompt() {
    return !localStorage.getItem(MIC_PROMPT_STORAGE_KEY);
  }

  function stopMicPromptLoop() {
    if (micPromptTimer) {
      clearInterval(micPromptTimer);
      micPromptTimer = null;
    }
  }

  function startMicPromptLoop() {
    if (!micAudio) return;
    stopMicPromptLoop();
    playAudioElement(micAudio).catch(() => {});
    micPromptTimer = window.setInterval(() => {
      playAudioElement(micAudio).catch(() => {});
    }, 15000);
  }

  function getRandomPromptItem() {
    const source = pool.length ? pool : images;
    if (!source.length) return null;
    return source[Math.floor(Math.random() * source.length)];
  }

  function requestMicrophoneAccess() {
    return new Promise(resolve => {
      if (!recognition) {
        resolve(false);
        return;
      }
      let finished = false;

      const finalize = () => {
        if (finished) return;
        finished = true;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        resolve(true);
      };

      const timeoutId = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch (error) {
          // ignore
        }
        finalize();
      }, 4000);

      const finalizeAndClear = () => {
        window.clearTimeout(timeoutId);
        finalize();
      };

      recognition.onresult = finalizeAndClear;
      recognition.onerror = finalizeAndClear;
      recognition.onend = finalizeAndClear;

      try {
        recognition.start();
      } catch (error) {
        window.clearTimeout(timeoutId);
        finalize();
      }
    });
  }

  function showMicActivationPrompt() {
    return new Promise(resolve => {
      const promptItem = getRandomPromptItem();
      if (!promptItem || !boardInner) {
        resolve();
        return;
      }

      awaiting = true;
      clearBoard();
      boardInner.classList.remove('board__inner--grid');

      const container = document.createElement('div');
      container.className = 'board__mic-prompt';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'board__mic-button';
      button.setAttribute('aria-label', 'Toque na imagem para ligar o microfone');

      const img = document.createElement('img');
      img.src = buildImageSrc(promptItem);
      img.alt = promptItem.en || 'Microfone';
      img.className = 'board__image-single board__mic-image';
      applyImageStyling(img, promptItem.file);

      button.appendChild(img);

      const text = document.createElement('p');
      text.className = 'board__mic-text';
      text.innerHTML = 'toque na imagem<br>para ligar o microfone';

      container.appendChild(button);
      container.appendChild(text);
      boardInner.appendChild(container);

      if (choiceRow) choiceRow.innerHTML = '';
      showText('');
      startMicPromptLoop();

      const handleActivate = () => {
        if (button.disabled) return;
        button.disabled = true;
        stopMicPromptLoop();
        localStorage.setItem(MIC_PROMPT_STORAGE_KEY, 'true');
        requestMicrophoneAccess().finally(() => {
          awaiting = false;
          resolve();
        });
      };

      button.addEventListener('click', handleActivate);
      button.addEventListener('touchstart', handleActivate, { passive: true });
    });
  }

  function showText(message) {
    if (!textContainer) return;
    if (!message) {
      textContainer.textContent = '';
      textContainer.classList.toggle('active', false);
      return;
    }

    if (phase === 7 && message.length > 20) {
      const lines = splitPhaseSevenText(message);
      textContainer.innerHTML = '';
      textContainer.appendChild(document.createTextNode(lines[0] || ''));
      if (lines[1]) {
        textContainer.appendChild(document.createElement('br'));
        textContainer.appendChild(document.createTextNode(lines[1]));
      }
    } else {
      textContainer.textContent = message;
    }

    textContainer.classList.toggle('active', true);
  }

  function renderWithDissolve(renderer) {
    if (typeof renderer !== 'function') return;
    if (!boardInner) {
      renderer();
      return;
    }

    boardInner.style.opacity = '0';
    window.setTimeout(() => {
      renderer();
      requestAnimationFrame(() => {
        boardInner.style.opacity = '1';
      });
    }, IMAGE_DISSOLVE_MS);
  }

  function startRotatingText() {
    if (!rotatingText) return;
    const phrases = ['Fluência Fácil', 'Inglês em 200 dias', 'Toque para começar'];
    rotatingText.classList.remove('is-fading');

    const fadeAndSwap = () => {
      rotatingText.classList.add('is-fading');
      window.setTimeout(() => {
        rotationIndex = (rotationIndex + 1) % phrases.length;
        rotatingText.textContent = phrases[rotationIndex];
        rotatingText.classList.remove('is-fading');
      }, ROTATION_FADE_MS);
    };

    rotationTimer = window.setInterval(() => {
      fadeAndSwap();
    }, 1500);
  }

  function clearBoard() {
    if (boardInner) boardInner.innerHTML = '';
    if (choiceRow) choiceRow.innerHTML = '';
  }

  function hidePhaseElements() {
    board.classList.add('board--hidden', 'hidden-phase');
    textContainer.classList.add('hidden-phase');
    choiceRow.classList.add('hidden-phase');
  }

  function showPhaseElements() {
    board.classList.remove('board--hidden', 'hidden-phase');
    textContainer.classList.remove('hidden-phase');
    choiceRow.classList.remove('hidden-phase');
  }

  async function playPhaseIntro(nextPhase, options = {}) {
    await loadAudioLevelsConfig();
    const audioName = getPhaseAudioName(level, nextPhase);
    if (!audioName) return false;
    const audio = await getAudioElementFromName(audioName);
    if (!audio) return false;
    const listened = hasListenedPhaseAudio(level, nextPhase);
    audio.addEventListener('ended', () => markPhaseAudioListened(level, nextPhase), { once: true });
    const allowSkip = listened && options.allowSkip !== false;
    const { allowSkip: _ignored, ...rest } = options;
    return playAudioElement(audio, { ...rest, allowSkip });
  }

  function preparePhaseIntro() {
    hidePhaseElements();
    showText('');
    clearBoard();
    if (choiceRow) choiceRow.innerHTML = '';
  }

  function getRandomWrongItem(excludeFile) {
    const options = pool.filter(entry => entry.file !== excludeFile);
    if (!options.length) return null;
    return options[Math.floor(Math.random() * options.length)];
  }

  function showPhaseOneCard(item) {
    currentItem = item;
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    const imageWrapper = createEntryImage(item, 'board__image-single board__image-single--phase-one');
    boardInner.appendChild(imageWrapper);

    const wrongItem = getRandomWrongItem(item.file) || item;
    const options = shuffle([
      { label: item.en, correct: true },
      { label: wrongItem.en, correct: false }
    ]);

    choiceRow.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => handlePhaseOneChoice(btn, opt.correct));
      choiceRow.appendChild(btn);
      scheduleButtonTextFit(btn, 16);
    });
  }

  function handlePhaseOneChoice(btn, correct) {
    if (awaiting) return;
    awaiting = true;
    choiceRow.querySelectorAll('button').forEach(b => { b.disabled = true; });
    let audio = correct ? successAudio : errorAudio;

    if (correct) {
      btn.classList.add('success');
      applyCorrectOutcome();
    } else {
      const autoCorrect = registerAttemptAndCheckAutoCorrect();
      if (autoCorrect) {
        btn.classList.add('success');
        applyCorrectOutcome();
        audio = successAudio;
      } else {
        btn.classList.add('error');
        const reset = registerErrorAndCheckReset();
        if (reset) {
          btn.classList.remove('error');
        }
        audio = errorAudio;
      }
    }

    updateProgressBar();
    playPronunciation(currentItem);
    audio && audio.play().catch(() => {});
    setTimeout(() => {
      awaiting = false;
      advanceCycle();
    }, getAdvanceDelay(1000));
  }

  function buildPhaseOptions(item, totalOptions = 4) {
    const wrongPool = pool.filter(entry => entry.file !== item.file);
    const wrongChoices = shuffle(wrongPool).slice(0, totalOptions - 1);

    while (wrongChoices.length < totalOptions - 1 && wrongPool.length) {
      const filler = wrongPool[Math.floor(Math.random() * wrongPool.length)];
      wrongChoices.push(filler);
    }

    while (wrongChoices.length < totalOptions - 1) {
      wrongChoices.push(item);
    }

    const options = [
      { ...item, correct: true },
      ...wrongChoices.slice(0, totalOptions - 1).map(choice => ({ ...choice, correct: false }))
    ];

    return shuffle(options).slice(0, totalOptions);
  }

  function showPhaseTwoCards(item) {
    currentItem = item;
    clearBoard();
    boardInner.classList.add('board__inner--grid');
    const selection = buildPhaseOptions(item, 4);

    selection.forEach(entry => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'grid-card grid-card--enter';
      card.dataset.correct = String(entry.correct === true);
      const imageWrapper = createEntryImage(entry, 'grid-card__image', { fill: true });
      card.appendChild(imageWrapper);
      card.addEventListener('click', () => handlePhaseTwoChoice(card));
      boardInner.appendChild(card);
    });

    playPronunciation(item);
  }

  function highlightCorrectCard() {
    boardInner.querySelectorAll('.grid-card').forEach(btn => {
      if (btn.dataset.correct === 'true') {
        btn.classList.add('grid-card--correct');
      }
    });
  }

  function handlePhaseTwoChoice(card) {
    if (awaiting) return;
    awaiting = true;
    const isCorrect = card.dataset.correct === 'true';
    let audio = isCorrect ? successAudio : errorAudio;
    highlightCorrectCard();
    if (!isCorrect) {
      card.classList.add('grid-card--wrong');
    }

    boardInner.querySelectorAll('.grid-card').forEach(btn => { btn.disabled = true; });

    if (isCorrect) {
      applyCorrectOutcome();
    } else {
      const autoCorrect = registerAttemptAndCheckAutoCorrect();
      if (autoCorrect) {
        applyCorrectOutcome();
        audio = successAudio;
        card.classList.remove('grid-card--wrong');
        card.classList.add('grid-card--correct');
      } else {
        registerErrorAndCheckReset();
        audio = errorAudio;
      }
    }

    audio && audio.play().catch(() => {});
    updateProgressBar();
    setTimeout(() => {
      awaiting = false;
      advanceCycle();
    }, getAdvanceDelay(1000));
  }

  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
    }
  }

  function updateRecognitionLanguage(targetPhase) {
    if (!recognition) return;
    recognition.lang = targetPhase === 5 ? 'pt-BR' : 'en-US';
  }

  function showPhaseThreeCard(item) {
    currentItem = item;
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const imageWrapper = createEntryImage(item, 'board__image-single board__image-speech');
    const img = imageWrapper.querySelector('img');
    img.setAttribute('aria-hidden', 'true');

    const speechBtn = document.createElement('button');
    speechBtn.type = 'button';
    speechBtn.className = 'phase-word-btn';
    speechBtn.textContent = item.en;
    speechBtn.setAttribute('aria-label', `Toque e repita: ${item.en}`);

    const startListening = () => {
      if (awaiting) return;
      handleSpeechChallenge(item.en, startListening, {
        onListeningStart: () => img.classList.add('board__image-speech--listening'),
        onListeningEnd: () => img.classList.remove('board__image-speech--listening'),
      });
    };

    img.addEventListener('click', startListening);
    img.addEventListener('touchstart', startListening, { passive: true });
    speechBtn.addEventListener('click', () => playPronunciation(item));

    boardInner.appendChild(imageWrapper);
    choiceRow.innerHTML = '';
    choiceRow.appendChild(speechBtn);
    scheduleButtonTextFit(speechBtn, 18);
    if (!localStorage.getItem(PHASE_THREE_HINT_STORAGE_KEY)) {
      const hint = document.createElement('p');
      hint.className = 'phase-mic-hint';
      hint.textContent = 'toque no circulo para ativar o microfone';
      choiceRow.appendChild(hint);
      localStorage.setItem(PHASE_THREE_HINT_STORAGE_KEY, 'true');
    }
    showText('');
  }

  function showPhaseFiveCard(item) {
    currentItem = item;
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const expectedText = item.pt || item.en;
    const buttonText = item.en || expectedText;
    const imageWrapper = createEntryImage(item, 'board__image-single board__image-speech');
    const img = imageWrapper.querySelector('img');
    img.setAttribute('aria-hidden', 'true');

    const startListening = () => {
      if (awaiting) return;
      handleSpeechChallenge(expectedText, startListening, {
        onListeningStart: () => img.classList.add('board__image-speech--listening'),
        onListeningEnd: () => img.classList.remove('board__image-speech--listening'),
        afterFeedback: () => playPronunciation(item)
      });
    };

    img.addEventListener('click', startListening);
    img.addEventListener('touchstart', startListening, { passive: true });

    const speechBtn = document.createElement('button');
    speechBtn.type = 'button';
    speechBtn.className = 'phase-word-btn';
    speechBtn.textContent = buttonText;
    speechBtn.setAttribute('aria-label', `Toque e repita: ${expectedText}`);
    speechBtn.addEventListener('click', startListening);

    boardInner.appendChild(imageWrapper);
    choiceRow.innerHTML = '';
    choiceRow.appendChild(speechBtn);
    scheduleButtonTextFit(speechBtn, 18);
    showText('');
  }

  function showPhaseSixCard(item) {
    currentItem = item;
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const expectedText = item.en;
    const imageWrapper = createEntryImage(item, 'board__image-single board__image-speech');
    const img = imageWrapper.querySelector('img');
    img.setAttribute('aria-hidden', 'true');

    const startListening = () => {
      if (awaiting) return;
      handleSpeechChallenge(expectedText, startListening, {
        onListeningStart: () => img.classList.add('board__image-speech--listening'),
        onListeningEnd: () => img.classList.remove('board__image-speech--listening')
      });
    };

    img.addEventListener('click', startListening);
    img.addEventListener('touchstart', startListening, { passive: true });

    boardInner.appendChild(imageWrapper);
    choiceRow.innerHTML = '';
    showText('');
  }

  function showPhaseSevenCard(item) {
    currentItem = item;
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const promptText = item.pt || item.en;
    const expected = item.en;
    const imageWrapper = createEntryImage(item, 'board__image-single board__image-speech');
    const img = imageWrapper.querySelector('img');
    img.setAttribute('aria-hidden', 'true');

    const startListening = () => {
      if (awaiting) return;
      handleSpeechChallenge(expected, startListening, {
        onListeningStart: () => img.classList.add('board__image-speech--listening'),
        onListeningEnd: () => img.classList.remove('board__image-speech--listening'),
        requireFullMatch: true,
        strictSequence: true,
        maxWordDistance: 1
      });
    };

    img.addEventListener('click', startListening);
    img.addEventListener('touchstart', startListening, { passive: true });

    const speechBtn = document.createElement('button');
    speechBtn.type = 'button';
    speechBtn.className = 'phase-word-btn';
    speechBtn.textContent = promptText;
    speechBtn.setAttribute('aria-label', `Toque e repita em inglês: ${promptText}`);
    speechBtn.addEventListener('click', startListening);

    boardInner.appendChild(imageWrapper);
    choiceRow.innerHTML = '';
    choiceRow.appendChild(speechBtn);
    scheduleButtonTextFit(speechBtn, 18);
    showText('');
  }

  function handleSpeechChallenge(expected, handler, options = {}) {
    if (awaiting) return;
    awaiting = true;
    const { onListeningStart, onListeningEnd } = options;
    if (typeof onListeningStart === 'function') {
      onListeningStart();
    }
    let resolved = false;
    const onResult = (spoken) => {
      if (resolved) return;
      resolved = true;
      const success = isSpokenCorrect(expected, spoken, options);

      if (typeof onListeningEnd === 'function') {
        onListeningEnd();
      }

      const triggerFeedback = (wasCorrect) => {
        const feedbackAudio = wasCorrect ? successAudio : errorAudio;
        const feedbackPromise = feedbackAudio ? playAudioElement(feedbackAudio) : Promise.resolve(false);
        if (typeof options.afterFeedback === 'function') {
          feedbackPromise
            .catch(() => false)
            .then(() => options.afterFeedback())
            .catch(() => {});
        } else {
          feedbackPromise.catch(() => {});
        }
      };

      if (success) {
        applyCorrectOutcome();
        triggerFeedback(true);
      } else {
        const autoCorrect = registerAttemptAndCheckAutoCorrect();
        if (autoCorrect) {
          applyCorrectOutcome();
          triggerFeedback(true);
        } else {
          registerErrorAndCheckReset();
          triggerFeedback(false);
        }
      }

      updateProgressBar();
      setTimeout(() => {
        awaiting = false;
        advanceCycle();
      }, getAdvanceDelay(1000));
    };

    if (recognition) {
      recognition.onresult = (event) => {
        const text = Array.from(event.results)
          .map(result => result[0] && result[0].transcript)
          .join(' ');
        onResult(text);
      };
      recognition.onerror = () => onResult('');
      recognition.onend = () => onResult('');
      recognition.start();
    } else {
      const typed = window.prompt('Diga o nome em inglês:') || '';
      onResult(typed);
    }

  }

  function playPhaseFourBatchAudio(batch) {
    let skipAll = false;
    const markSkip = () => {
      skipAll = true;
    };

    return batch.reduce((promise, entry) => (
      promise.then(() => {
        if (skipAll) return null;
        return playPronunciation(entry, {
          rate: 1.2,
          preservePitch: true,
          allowSkip: true,
          onSkip: markSkip
        });
      })
    ), Promise.resolve());
  }

  function initializePhaseFourBatch() {
    if (!cycle.length) return [];
    if (phaseFourBatchStart > index || index >= phaseFourBatchStart + PHASE_FOUR_BATCH_SIZE) {
      phaseFourBatchStart = index;
      phaseFourResolved = 0;
      phaseFourExpectedIndex = 0;
    }
    phaseFourBatch = cycle.slice(phaseFourBatchStart, phaseFourBatchStart + PHASE_FOUR_BATCH_SIZE);
    phaseFourExpectedIndex = Math.min(phaseFourResolved, phaseFourBatch.length);
    return phaseFourBatch;
  }

  function showPhaseFourCard() {
    currentItem = null;
    clearBoard();
    boardInner.classList.add('board__inner--grid');
    phaseFourAudioPlaying = false;
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const batch = initializePhaseFourBatch();
    const shuffledBatch = shuffle(batch);
    if (!batch.length) {
      handleProgressCompletion();
      return;
    }
    updateProgressBar();

    boardInner.innerHTML = '';
    const resolvedFiles = new Set(batch.slice(0, phaseFourResolved).map(entry => entry.file));
    shuffledBatch.forEach((entry) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'grid-card grid-card--enter';
      card.dataset.file = entry.file;
      const imageWrapper = createEntryImage(entry, 'grid-card__image', { fill: true });
      card.appendChild(imageWrapper);

      if (resolvedFiles.has(entry.file)) {
        card.classList.add('grid-card--correct', 'grid-card--gone');
        card.disabled = true;
      }

      card.addEventListener('click', () => {
        if ((awaiting && !phaseFourAudioPlaying) || card.disabled) return;
        const expected = batch[phaseFourExpectedIndex];
        const isCorrect = expected && expected.file === entry.file;
        if (isCorrect) {
          errorStreak = 0;
          card.classList.add('grid-card--correct');
          card.disabled = true;
          phaseFourExpectedIndex += 1;
          phaseFourResolved += 1;
          applyCorrectOutcome();
          successAudio && successAudio.play().catch(() => {});
          updateProgressBar();

          window.setTimeout(() => {
            card.classList.add('grid-card--dissolve');
            window.setTimeout(() => {
              card.classList.add('grid-card--gone');
            }, PHASE_FOUR_DISSOLVE_MS);
          }, PHASE_FOUR_GREEN_MS);

          if (phaseFourExpectedIndex >= batch.length) {
            awaiting = true;
            window.setTimeout(() => {
              awaiting = false;
              if (index >= cycle.length) {
                handleProgressCompletion();
              } else {
                phaseFourBatchStart = index;
                phaseFourResolved = 0;
                phaseFourExpectedIndex = 0;
                advanceCycle();
              }
            }, PHASE_FOUR_GREEN_MS + PHASE_FOUR_DISSOLVE_MS);
          }
        } else {
          card.classList.add('grid-card--wrong');
          const reset = registerErrorAndCheckReset();
          errorAudio && errorAudio.play().catch(() => {});
          updateProgressBar();
          window.setTimeout(() => {
            card.classList.remove('grid-card--wrong');
          }, 600);
          if (reset) {
            window.setTimeout(() => {
              phaseFourBatchStart = 0;
              phaseFourResolved = 0;
              phaseFourExpectedIndex = 0;
              advanceCycle();
            }, 700);
          }
        }
      });
      boardInner.appendChild(card);
    });

    choiceRow.innerHTML = '';
    showText('');

    if (phaseFourResolved === 0) {
      awaiting = true;
      phaseFourAudioPlaying = true;
      playPhaseFourBatchAudio(batch).finally(() => {
        awaiting = false;
        phaseFourAudioPlaying = false;
      });
    }
  }

  function advanceCycle() {
    if (!cycle.length) return;

    if (index >= cycle.length) {
      handleProgressCompletion();
      return;
    }

    const item = cycle[index];
    renderWithDissolve(() => {
      showText('');

      switch (phase) {
        case 1:
          showPhaseOneCard(item);
          break;
        case 2:
          showPhaseTwoCards(item);
          break;
        case 3:
          showPhaseThreeCard(item);
          break;
        case 4:
          showPhaseFourCard();
          break;
        case 5:
          showPhaseFiveCard(item);
          break;
        case 6:
          showPhaseSixCard(item);
          break;
        case 7:
          showPhaseSevenCard(item);
          break;
        default:
          showPhaseOneCard(item);
      }
    });
  }

  function buildCompletionGridItems(target) {
    const basePool = images.length ? images : pool;
    const fallbackPool = basePool.filter(entry => entry && entry.file && entry.file !== target.file);
    const randomOptions = shuffle(fallbackPool).slice(0, 3);

    while (randomOptions.length < 3 && fallbackPool.length) {
      const candidate = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
      randomOptions.push(candidate);
    }

    while (randomOptions.length < 3) {
      randomOptions.push(target);
    }

    const selection = [target, ...randomOptions.slice(0, 3)];
    return shuffle(selection).slice(0, 4);
  }

  function showCompletionGrid(target) {
    if (!target) return;

    clearBoard();
    boardInner.classList.add('board__inner--grid');
    const items = buildCompletionGridItems(target);

    items.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'grid-card grid-card--enter grid-card--static';
      const imageWrapper = createEntryImage(entry, 'grid-card__image', { fill: true });
      card.appendChild(imageWrapper);
      boardInner.appendChild(card);
    });

    playPronunciation(target);
  }

  function showProgressCompletionOverlay(nextPhase) {
    return new Promise(resolve => {
      if (progressCompleteOverlay) {
        progressCompleteOverlay.classList.add('active');
        progressCompleteOverlay.setAttribute('aria-hidden', 'false');
      }

      Promise.resolve(playPhaseIntro(nextPhase)).then(() => {
        if (progressCompleteOverlay) {
          progressCompleteOverlay.classList.remove('active');
          progressCompleteOverlay.setAttribute('aria-hidden', 'true');
        }
        resolve();
      });
    });
  }

  async function showPhaseTransition(nextPhase) {
    if (!phaseTransition || !phaseTransitionBtn || !phaseTransitionTitle) {
      startPhase(nextPhase);
      return;
    }

    const config = {
      1: { title: 'Fase 1', cta: 'Iniciar fase 1' },
      2: { title: 'Fase 2', cta: 'Iniciar fase 2' },
      3: { title: 'Fase 3', cta: 'Iniciar fase 3' },
      4: { title: 'Fase 4', cta: 'Iniciar fase 4' },
      5: { title: 'Fase 5', cta: 'Iniciar fase 5' },
      6: { title: 'Fase 6', cta: 'Iniciar fase 6' },
      7: { title: 'Fase 7', cta: 'Iniciar fase 7' }
    }[nextPhase] || {
      title: `Fase ${nextPhase}`,
      cta: 'Continuar'
    };

    phaseTransitionTitle.textContent = config.title;
    phaseTransitionBtn.textContent = config.cta;
    phaseTransition.classList.remove('hidden');
    phaseTransition.setAttribute('aria-hidden', 'false');

    phaseTransitionBtn.disabled = true;
    if (phaseAudioSkip) {
      phaseAudioSkip.classList.add('is-hidden');
    }
    if (phaseAudioProgress) {
      phaseAudioProgress.classList.remove('is-hidden');
    }

    await loadAudioLevelsConfig();
    const audioName = getPhaseAudioName(level, nextPhase);
    const audio = audioName ? await getAudioElementFromName(audioName) : null;
    const hasAudio = Boolean(audioName && audio);
    let audioPlaying = false;
    let cleanupProgress = null;
    let listened = hasAudio ? hasListenedPhaseAudio(level, nextPhase) : false;

    const detachAudioListeners = () => {
      phaseTransition.removeEventListener('click', attemptUnlock);
      phaseTransition.removeEventListener('touchstart', attemptUnlock);
      phaseTransition.removeEventListener('pointerdown', attemptUnlock);
    };

    const startNextPhase = () => {
      phaseTransitionBtn.removeEventListener('click', startNextPhase);
      detachAudioListeners();
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (cleanupProgress) {
        cleanupProgress();
        cleanupProgress = null;
      }
      phaseTransition.classList.add('hidden');
      phaseTransition.setAttribute('aria-hidden', 'true');
      startPhase(nextPhase, { skipIntroAudio: true });
    };

    function attemptUnlock() {
      if (!hasAudio || audioPlaying || !audio) return;
      audioPlaying = true;
      if (cleanupProgress) cleanupProgress();
      cleanupProgress = trackPhaseAudioProgress(audio);
      audio.addEventListener(
        'ended',
        () => {
          markPhaseAudioListened(level, nextPhase);
          listened = true;
          phaseTransitionBtn.disabled = false;
        },
        { once: true }
      );
      playAudioElement(audio).then((played) => {
        audioPlaying = false;
        if (cleanupProgress) {
          cleanupProgress();
          cleanupProgress = null;
        }
        if (!played) {
          if (audio.error) {
            phaseTransitionBtn.disabled = false;
          }
          return;
        }
        if (!listened) {
          markPhaseAudioListened(level, nextPhase);
          listened = true;
        }
        phaseTransitionBtn.disabled = false;
      });
    }

    phaseTransitionBtn.addEventListener('click', startNextPhase);
    if (hasAudio) {
      if (listened) {
        phaseTransitionBtn.disabled = false;
        if (phaseAudioSkip) {
          phaseAudioSkip.classList.remove('is-hidden');
        }
      }
      phaseTransition.addEventListener('click', attemptUnlock);
      phaseTransition.addEventListener('touchstart', attemptUnlock, { passive: true });
      phaseTransition.addEventListener('pointerdown', attemptUnlock);
      attemptUnlock();
    } else {
      phaseTransitionBtn.disabled = false;
      if (phaseAudioProgress) {
        phaseAudioProgress.classList.add('is-hidden');
      }
    }
  }

  function handleProgressCompletion() {
    pauseLevelTimer();
    persistProgressState();
    if (phase === 1 || phase === 2 || phase === 3 || phase === 4) {
      awaiting = false;
      completionGridShown = true;
      clearBoard();
      showText('');
      if (choiceRow) choiceRow.innerHTML = '';
      hidePhaseElements();
      showPhaseTransition(phase + 1);
      return;
    }

    if (phase >= 5) {
      awaiting = false;
      handlePhaseComplete();
      return;
    }

    if (completionGridShown) {
      handlePhaseComplete();
      return;
    }

    completionGridShown = true;
    if (!currentItem) {
      handlePhaseComplete();
      return;
    }

    awaiting = true;
    showCompletionGrid(currentItem);
    setTimeout(() => {
      awaiting = false;
      handlePhaseComplete();
    }, 1500);
  }

  function dissolveEnvironment(callback) {
    hidePhaseElements();
    setTimeout(() => {
      if (typeof callback === 'function') {
        callback();
      }
    }, PHASE_DISSOLVE_MS);
  }

  async function startPhase(nextPhase, options = {}) {
    const { skipIntroAudio = false } = options;
    phase = nextPhase;
    updatePhaseLabel();
    updateRecognitionLanguage(nextPhase);
    applyBoardSizing(nextPhase);
    stopMicPromptLoop();
    if (nextPhase === 1) {
      resetLevelState();
    }
    filterPool();
    resetProgress();
    preparePhaseIntro();
    if (!skipIntroAudio) {
      await playPhaseIntro(nextPhase);
    }
    if (nextPhase === 1) {
      startLevelTimer();
    } else {
      resumePausedLevelTimer();
    }
    advanceCycle();
    requestAnimationFrame(() => {
      showPhaseElements();
    });
  }

  function showLevelCompleteOverlay(completedLevel) {
    const previousLevel = Number.isFinite(completedLevel) ? completedLevel : level;
    const nextLevel = level;
    saveLevelToStorage();
    updateLevelIndicators();
    levelCompleteText.textContent = `Você concluiu o dia ${previousLevel}. Vamos para o dia ${nextLevel}?`;
    if (levelCountdown) {
      levelCountdown.textContent = '';
    }
    levelComplete.classList.remove('hidden');
    nextLevelBtn.disabled = true;
    nextLevelBtn.classList.add('is-hidden');
    nextLevelBtn.textContent = 'Ir para o próximo';
    if (replayLevelBtn) {
      replayLevelBtn.disabled = false;
    }
    clearLevelUnlockTimer();

    const shouldPlayConclusion = previousLevel === 1 && conclusionAudio;
    const playPromise = shouldPlayConclusion ? playAudioElement(conclusionAudio) : Promise.resolve();

    playPromise.then(() => {
      if (previousLevel === 1) {
        const unlockAt = getLevelTwoUnlockAt() || setNextLevelTwoUnlockAt();
        const updateUnlockState = () => {
          const remainingMs = unlockAt - Date.now();
          if (remainingMs <= 0) {
            clearLevelUnlockTimer();
            nextLevelBtn.disabled = false;
            nextLevelBtn.textContent = `Iniciar dia ${nextLevel}`;
            nextLevelBtn.classList.remove('is-hidden');
            if (levelCountdown) {
              levelCountdown.textContent = 'Próximo dia liberado!';
            }
            return;
          }
          const { hours, minutes } = formatCountdownTime(remainingMs);
          nextLevelBtn.disabled = true;
          if (levelCountdown) {
            levelCountdown.textContent = `Próximo dia em ${hours} horas e ${minutes} minutos`;
          }
        };
        updateUnlockState();
        levelUnlockTimer = window.setInterval(updateUnlockState, 60000);
      } else {
        nextLevelBtn.disabled = false;
        nextLevelBtn.classList.remove('is-hidden');
        if (levelCountdown) {
          levelCountdown.textContent = 'Próximo dia liberado!';
        }
      }
    });
  }

  function handlePhaseComplete(options = {}) {
    const { skipIntroAudio = false } = options;
    if (phase === 7) {
      const completedLevel = level;
      const medalKey = currentMedalKey;
      const finalElapsedMs = getLevelElapsedMs();
      registerMedalResult(completedLevel, medalKey);
      updateLevelBestTime(completedLevel, finalElapsedMs);
      updateFinalMedal(medalKey);
      currentMedalKey = medalKey;
      saveCompletionStorage({
        completedLevel,
        medalKey,
        completedAt: Date.now()
      });
      clearProgressStorage();
      level += 1;
      completedLevelSnapshot = completedLevel;
      showFinalSequence(completedLevel, finalElapsedMs);
      return;
    }

    dissolveEnvironment(() => {
      startPhase(phase + 1, { skipIntroAudio });
    });
  }

  async function showFinalSequence(completedLevel, finalElapsedMs = 0) {
    if (finalOverlay) {
      finalOverlay.classList.add('active');
      finalOverlay.setAttribute('aria-hidden', 'false');
    }
    if (finalTotalTimeEl) {
      finalTotalTimeEl.textContent = formatElapsedTime(finalElapsedMs);
    }
    if (finalPronunciationEl) {
      const pronunciationAverage = getPronunciationAverage();
      finalPronunciationEl.textContent = `${pronunciationAverage.toFixed(1)}%`;
    }

    await loadAudioLevelsConfig();
    const postGameAudioName = getPostGameAudioName(completedLevel);
    const postGameAudio = postGameAudioName ? await getAudioElementFromName(postGameAudioName) : null;
    const durationMs = postGameAudio && postGameAudio.duration ? postGameAudio.duration * 1000 : 5000;
    const updateProgress = (percent) => {
      if (finalProgressFill) {
        finalProgressFill.style.width = `${percent}%`;
      }
      if (finalProgressBar) {
        finalProgressBar.setAttribute('aria-valuenow', String(Math.round(percent)));
      }
    };

    updateProgress(0);

    let progressTimer = null;
    if (finalProgressFill) {
      const start = Date.now();
      progressTimer = window.setInterval(() => {
        const elapsed = Date.now() - start;
        const percent = Math.min(100, (elapsed / durationMs) * 100);
        updateProgress(percent);
        if (percent >= 100) {
          clearInterval(progressTimer);
        }
      }, 100);
    }

    const finalize = () => {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      if (finalOverlay) {
        finalOverlay.classList.remove('active');
        finalOverlay.setAttribute('aria-hidden', 'true');
      }
      updateProgress(100);
      showLevelCompleteOverlay(completedLevel);
    };

    if (postGameAudio) {
      playAudioElement(postGameAudio).then(finalize);
    } else {
      window.setTimeout(finalize, durationMs);
    }
  }

  function handleStartInteraction() {
    if (gameStarted) return;
    gameStarted = true;
    clearCompletionStorage();
    clearProgressStorage();

    if (startScreen) {
      startScreen.classList.add('start-screen--blank');
      startScreen.classList.add('hidden');
    }

    if (rotationTimer) {
      clearInterval(rotationTimer);
      rotationTimer = null;
    }

    loadAllImages().then(() => {
      showPhaseTransition(1);
    });
  }

  function setupMedalSkipShortcut() {
    const medalTarget = gameMedalIcon ? gameMedalIcon.closest('.game-medal') || gameMedalIcon : null;
    if (!medalTarget) return;
    let taps = 0;
    let resetTimer = null;

    const reset = () => {
      taps = 0;
      if (resetTimer) {
        clearTimeout(resetTimer);
        resetTimer = null;
      }
    };

    const handleTap = () => {
      taps += 1;
      if (taps >= 3) {
        reset();
        handleProgressCompletion();
        return;
      }
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
      resetTimer = window.setTimeout(reset, 800);
    };

    medalTarget.addEventListener('pointerdown', handleTap);
  }

  function init() {
    const storedProgress = readProgressStorage();
    const completionState = readCompletionStorage();
    if (!storedProgress || !storedProgress.level) {
      loadLevelFromStorage();
    }
    updatePhaseLabel();
    setupSpeechRecognition();
    resetLevelState();
    loadAllImages().then(() => {
      if (storedProgress && restoreProgressState()) {
        gameStarted = true;
        if (startScreen) {
          startScreen.classList.add('start-screen--blank');
          startScreen.classList.add('hidden');
        }
        if (rotationTimer) {
          clearInterval(rotationTimer);
          rotationTimer = null;
        }
        showPhaseElements();
        advanceCycle();
        return;
      }

      if (completionState && completionState.completedLevel) {
        gameStarted = true;
        completedLevelSnapshot = completionState.completedLevel;
        if (startScreen) {
          startScreen.classList.add('start-screen--blank');
          startScreen.classList.add('hidden');
        }
        showLevelCompleteOverlay(completionState.completedLevel);
      }
    });

    if (!storedProgress && !(completionState && completionState.completedLevel)) {
      startRotatingText();
    }

    if (startScreen) {
      startScreen.addEventListener('click', handleStartInteraction);
      startScreen.addEventListener('touchstart', handleStartInteraction, { passive: true });
      startScreen.addEventListener('pointerdown', handleStartInteraction);
    }

    setupMedalSkipShortcut();

    nextLevelBtn.addEventListener('click', () => {
      if (level === 2 && isLevelTwoLocked()) {
        return;
      }
      clearLevelUnlockTimer();
      clearCompletionStorage();
      clearProgressStorage();
      levelComplete.classList.add('hidden');
      phase = 1;
      updatePhaseLabel();
      showPhaseTransition(1);
    });

    if (replayLevelBtn) {
      replayLevelBtn.addEventListener('click', () => {
        clearLevelUnlockTimer();
        clearCompletionStorage();
        clearProgressStorage();
        levelComplete.classList.add('hidden');
        if (Number.isFinite(completedLevelSnapshot)) {
          level = completedLevelSnapshot;
        }
        phase = 1;
        updatePhaseLabel();
        showPhaseTransition(1);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
