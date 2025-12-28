(() => {
  const MAX_LEVEL = 100;
  const LEVEL_SIZES = Array.from({ length: MAX_LEVEL }, () => 25);

  const state = {
    allItems: [],
    levelBlocks: {},
    items: [],
    index: 0,
    recognizer: null,
    listening: false,
    advanceLock: false,
    lensOverrides: null,
    preloaded: new Set(),
    transitionAudio: null,
    currentLevel: 1,
    round: 1,
    correct: 0,
    incorrect: 0,
    roundComplete: false,
    round1Passed: false,
    feedbackHandlers: { primary: null, secondary: null },
    filteredItems: [],
    activeFolders: new Set()
  };

  const elements = {
    instruction: document.getElementById('image-game-instruction'),
    target: document.getElementById('image-game-target'),
    status: document.getElementById('image-game-status'),
    transcript: document.getElementById('image-game-transcript'),
    english: document.getElementById('image-game-english'),
    gameMain: document.getElementById('game-main'),
    audioButton: document.getElementById('image-game-audio'),
    translateButton: document.getElementById('image-game-translate'),
    correctButton: document.getElementById('image-game-correct'),
    wrongButton: document.getElementById('image-game-wrong'),
    roundLabel: document.getElementById('image-game-round-label'),
    counts: document.getElementById('image-game-counts'),
    feedback: document.getElementById('image-game-feedback'),
    feedbackTitle: document.getElementById('image-game-feedback-title'),
    feedbackDescription: document.getElementById('image-game-feedback-description'),
    feedbackCorrect: document.getElementById('image-game-feedback-correct'),
    feedbackErrors: document.getElementById('image-game-feedback-errors'),
    feedbackPrimary: document.getElementById('image-game-feedback-primary'),
    feedbackSecondary: document.getElementById('image-game-feedback-secondary'),
    headerLevel: document.getElementById('header-level'),
    folderList: document.getElementById('image-game-folders'),
    startButton: document.getElementById('image-game-start'),
    levelSlider: document.getElementById('image-game-level'),
    levelValue: document.getElementById('image-game-level-value'),
    activeCount: document.getElementById('image-game-active-count')
  };

  const setPlayingLayout = (isPlaying) => {
    const body = document.body;
    if (!body) return;
    body.classList.toggle('image-game--playing', isPlaying);
  };

  const normalizeText = (value) => {
    if (!value) return '';
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s'-]/g, '')
      .trim();
  };

  const parseItem = (entry) => {
    if (!entry) return null;
    if (typeof entry === 'string') {
      const parts = entry.split('#');
      if (parts.length < 3) return null;
      const [pt, en, file] = parts;
      return { pt: pt || '', en: en || '', file: file || '', level: '1', folder: 'objetos' };
    }
    if (typeof entry === 'object') {
      return {
        pt: entry.pt || entry.portuguese || '',
        en: entry.en || entry.english || '',
        file: entry.file || entry.image || '',
        level: entry.level || '1',
        folder: entry.folder || 'objetos'
      };
    }
    return null;
  };

  const getFileIndex = (fileName) => {
    if (!fileName) return 0;
    const match = fileName.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const getItemLevel = (item) => {
    if (!item) return 1;
    const parsed = parseInt(item.level, 10);
    return Number.isFinite(parsed) ? parsed : getFileIndex(item.file) || 1;
  };

  const shuffle = (list) => {
    const array = [...list];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const swapIndex = Math.floor(Math.random() * (i + 1));
      [array[i], array[swapIndex]] = [array[swapIndex], array[i]];
    }
    return array;
  };

  const buildLevelBlocks = (items) => {
    const sorted = [...items].sort((a, b) => {
      const levelDiff = getItemLevel(a) - getItemLevel(b);
      if (levelDiff !== 0) return levelDiff;
      return getFileIndex(a.file) - getFileIndex(b.file);
    });
    const blocks = {};
    let cursor = 0;

    LEVEL_SIZES.forEach((size, levelIndex) => {
      const levelNumber = levelIndex + 1;
      const slice = sorted.slice(cursor, cursor + size);
      cursor += size;
      blocks[levelNumber] = slice;
    });

    return blocks;
  };

  const getRoundSize = (level) => LEVEL_SIZES[Math.min(Math.max(level, 1), LEVEL_SIZES.length) - 1] || 25;

  const hiddenClass = 'image-game-target--hidden';

  const updateHeaderLevel = () => {
    if (!elements.headerLevel) return;
    elements.headerLevel.textContent = `Nível ${state.currentLevel}`;
  };

  const updateRoundLabel = () => {
    if (!elements.roundLabel) return;
    elements.roundLabel.textContent = `Rodada ${state.round}`;
  };

  const updateCounts = () => {
    if (!elements.counts) return;
    elements.counts.textContent = `${state.correct} acertos · ${state.incorrect} erros`;
  };

  const getSelectedLevel = () => {
    if (!elements.levelSlider) return state.currentLevel || 1;
    const value = parseInt(elements.levelSlider.value, 10);
    if (!Number.isFinite(value)) return state.currentLevel || 1;
    return Math.min(Math.max(value, 1), MAX_LEVEL);
  };

  const updateLevelValue = (value) => {
    if (elements.levelValue) {
      elements.levelValue.textContent = value;
    }
  };

  const syncLevelSlider = (value) => {
    if (!elements.levelSlider) return;
    const normalized = Math.min(Math.max(value, 1), MAX_LEVEL);
    elements.levelSlider.value = String(normalized);
    updateLevelValue(normalized);
  };

  const updateActiveWordCount = () => {
    if (!elements.activeCount) return;
    const levelLimit = getSelectedLevel();
    const activeFolders = state.activeFolders && state.activeFolders.size
      ? state.activeFolders
      : new Set();
    const total = state.allItems.filter((item) => {
      const folder = item.folder || 'objetos';
      return activeFolders.has(folder) && getItemLevel(item) <= levelLimit;
    }).length;
    elements.activeCount.textContent = total;
  };

  const clearSlideClasses = () => {
    if (!elements.target) return;
    elements.target.classList.remove('image-game-target--slide-in', 'image-game-target--slide-out');
  };

  const setListeningState = (isListening) => {
    state.listening = isListening;
    if (elements.target) {
      elements.target.classList.toggle('is-listening', isListening);
    }
  };

  const runSlideAnimation = (className) => {
    if (!elements.target) return Promise.resolve();
    clearSlideClasses();
    if (className === 'image-game-target--slide-in') {
      elements.target.classList.remove(hiddenClass);
    }
    return new Promise((resolve) => {
      const handleAnimationEnd = () => {
        elements.target.removeEventListener('animationend', handleAnimationEnd);
        if (className === 'image-game-target--slide-out') {
          elements.target.classList.add(hiddenClass);
          resolve();
          return;
        }
        elements.target.classList.remove(className);
        resolve();
      };
      elements.target.addEventListener('animationend', handleAnimationEnd);
      elements.target.classList.add(className);
    });
  };

  const preloadUpcomingImages = () => {
    if (!state.items.length) return;
    for (let offset = 1; offset <= 5; offset += 1) {
      const item = state.items[(state.index + offset) % state.items.length];
      if (!item || state.preloaded.has(item.file)) continue;
      const img = new Image();
      img.src = `images/${item.file}`;
      state.preloaded.add(item.file);
    }
  };

  const updateImage = ({ animateIn = false } = {}) => {
    const current = state.items[state.index];
    if (!current || !elements.target) return;
    elements.target.src = `images/${current.file}`;
    elements.target.alt = current.pt ? `Imagem ${current.pt}` : 'Imagem do jogo';
    state.preloaded.add(current.file);
    if (animateIn) {
      runSlideAnimation('image-game-target--slide-in');
    }
    hidePhrase();
    preloadUpcomingImages();
  };

  const playTransitionSound = () => {
    if (!state.transitionAudio) {
      state.transitionAudio = new Audio('gamesounds/report.wav');
    }
    state.transitionAudio.currentTime = 0;
    state.transitionAudio.play().catch(() => {});
  };

  const showStatus = (message, tone = '') => {
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.dataset.tone = tone;
  };

  const isEditDistanceWithinOne = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    const lengthDiff = Math.abs(a.length - b.length);
    if (lengthDiff > 1) return false;

    let i = 0;
    let j = 0;
    let edits = 0;

    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        i += 1;
        j += 1;
        continue;
      }
      edits += 1;
      if (edits > 1) return false;
      if (a.length > b.length) {
        i += 1;
      } else if (a.length < b.length) {
        j += 1;
      } else {
        i += 1;
        j += 1;
      }
    }

    return edits + (a.length - i) + (b.length - j) <= 1;
  };

  const isCloseMatch = (expected, spoken) => {
    if (!expected || !spoken) return false;
    if (expected === spoken) return true;
    return isEditDistanceWithinOne(expected, spoken);
  };

  const showTranscript = (message) => {
    if (!elements.transcript) return;
    elements.transcript.textContent = message;
  };

  const resetRoundStats = () => {
    state.correct = 0;
    state.incorrect = 0;
    state.roundComplete = false;
    updateCounts();
  };

  const hideFeedback = () => {
    if (!elements.feedback) return;
    elements.feedback.setAttribute('hidden', '');
    state.feedbackHandlers = { primary: null, secondary: null };
  };

  const formatFolderLabel = (folder) => {
    if (!folder) return 'Outros';
    const normalized = folder.replace(/[-_]+/g, ' ').trim();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const buildFolderSummary = (items) => {
    const summary = {};
    items.forEach((item) => {
      const folder = item.folder || 'objetos';
      if (!summary[folder]) {
        summary[folder] = { count: 0, samples: [] };
      }
      summary[folder].count += 1;
      summary[folder].samples.push(item);
    });
    return summary;
  };

  const updateFolderButtonState = (button, isActive) => {
    button.classList.toggle('is-muted', !isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  };

  const renderFolderButtons = (summary) => {
    if (!elements.folderList) return;
    elements.folderList.innerHTML = '';
    const folders = Object.keys(summary).sort((a, b) => a.localeCompare(b));
    state.activeFolders = new Set(folders);

    folders.forEach((folder) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'image-game-folder';
      button.dataset.folder = folder;
      updateFolderButtonState(button, true);

      const header = document.createElement('div');
      header.className = 'image-game-folder__header';
      const title = document.createElement('div');
      title.className = 'image-game-folder__title';
      title.textContent = formatFolderLabel(folder);
      const count = document.createElement('div');
      count.className = 'image-game-folder__count';
      count.textContent = `${summary[folder].count} palavras`;
      header.appendChild(title);
      header.appendChild(count);

      const preview = document.createElement('div');
      preview.className = 'image-game-folder__preview';
      const samples = summary[folder].samples
        .slice()
        .sort((a, b) => getItemLevel(a) - getItemLevel(b) || getFileIndex(a.file) - getFileIndex(b.file))
        .slice(0, 3);
      samples.forEach((sample) => {
        const img = document.createElement('img');
        img.src = `images/${sample.file}`;
        img.alt = sample.pt || 'Imagem de exemplo';
        preview.appendChild(img);
      });

      button.appendChild(header);
      button.appendChild(preview);

      button.addEventListener('click', () => {
        if (state.activeFolders.has(folder)) {
          state.activeFolders.delete(folder);
          updateFolderButtonState(button, false);
        } else {
          state.activeFolders.add(folder);
          updateFolderButtonState(button, true);
        }
        updateActiveWordCount();
      });
      elements.folderList.appendChild(button);
    });
    updateActiveWordCount();
  };

  const showFeedback = ({ title, description, primaryLabel, secondaryLabel, onPrimary, onSecondary }) => {
    if (!elements.feedback || !elements.feedbackTitle || !elements.feedbackDescription) return;

    elements.feedbackTitle.textContent = title;
    elements.feedbackDescription.textContent = description;
    elements.feedbackCorrect.textContent = state.correct;
    elements.feedbackErrors.textContent = state.incorrect;

    if (elements.feedbackPrimary) {
      elements.feedbackPrimary.textContent = primaryLabel;
      elements.feedbackPrimary.disabled = !primaryLabel;
    }

    if (elements.feedbackSecondary) {
      if (secondaryLabel) {
        elements.feedbackSecondary.textContent = secondaryLabel;
        elements.feedbackSecondary.removeAttribute('hidden');
        elements.feedbackSecondary.disabled = false;
      } else {
        elements.feedbackSecondary.setAttribute('hidden', '');
      }
    }

    state.feedbackHandlers = {
      primary: typeof onPrimary === 'function' ? onPrimary : null,
      secondary: typeof onSecondary === 'function' ? onSecondary : null
    };

    elements.feedback.removeAttribute('hidden');
  };

  const syncTranslateButton = () => {
    if (!elements.translateButton || !elements.english) return;
    elements.translateButton.setAttribute(
      'aria-pressed',
      elements.english.hasAttribute('hidden') ? 'false' : 'true'
    );
  };

  const hidePhrase = () => {
    if (!elements.english) return;
    elements.english.textContent = '';
    elements.english.dataset.language = 'en';
    elements.english.setAttribute('hidden', '');
    syncTranslateButton();
  };

  const showPhrase = (language = 'en') => {
    if (!elements.english) return;
    const current = state.items[state.index];
    if (!current) return;
    const text = language === 'pt' ? current.pt : current.en;
    if (!text) return;
    elements.english.textContent = text;
    elements.english.dataset.language = language;
    elements.english.removeAttribute('hidden');
    syncTranslateButton();
  };

  const togglePhraseLanguage = () => {
    if (!elements.english || elements.english.hasAttribute('hidden')) return;
    const currentLanguage = elements.english.dataset.language === 'pt' ? 'pt' : 'en';
    const nextLanguage = currentLanguage === 'en' ? 'pt' : 'en';
    showPhrase(nextLanguage);
  };

  const getLevelBlock = (level) => {
    const block = state.levelBlocks[level] || [];
    if (block.length) return block;
    const fallbackSize = getRoundSize(level);
    const source = state.filteredItems.length ? state.filteredItems : state.allItems;
    return source.slice(-fallbackSize);
  };

  const getRoundItems = (round) => {
    const size = getRoundSize(state.currentLevel);
    if (round === 1) {
      return shuffle(getLevelBlock(state.currentLevel)).slice(0, size);
    }

    const unlocked = [];
    for (let level = 1; level <= state.currentLevel; level += 1) {
      unlocked.push(...getLevelBlock(level));
    }

    const uniqueMap = new Map();
    unlocked.forEach((item) => {
      if (!uniqueMap.has(item.file)) {
        uniqueMap.set(item.file, item);
      }
    });

    return shuffle(Array.from(uniqueMap.values())).slice(0, size);
  };

  const advanceImage = () => {
    if (state.advanceLock || state.roundComplete) return;
    if (!state.items.length) return;

    const hasNext = state.index < state.items.length - 1;
    if (!hasNext) {
      state.roundComplete = true;
      finishRound();
      return;
    }

    state.advanceLock = true;
    const nextIndex = state.index + 1;
    showTranscript('');
    showStatus('');
    playTransitionSound();
    runSlideAnimation('image-game-target--slide-out')
      .then(() => {
        state.index = nextIndex;
        updateImage();
        return runSlideAnimation('image-game-target--slide-in');
      })
      .finally(() => {
        state.advanceLock = false;
      });
  };

  const registerAnswer = (isCorrect) => {
    if (!state.items.length || state.roundComplete) return;
    if (isCorrect) {
      state.correct += 1;
    } else {
      state.incorrect += 1;
    }

    updateCounts();

    const isLast = state.index >= state.items.length - 1;
    if (isLast) {
      state.roundComplete = true;
      finishRound();
      return;
    }

    advanceImage();
  };

  const finishRound = () => {
    const roundTitle = `Rodada ${state.round} concluída`;
    const perfectRound1 =
      state.round === 1 && state.incorrect === 0 && state.correct >= state.items.length;

    if (state.round === 1) {
      state.round1Passed = perfectRound1;
      showFeedback({
        title: roundTitle,
        description: perfectRound1
          ? `Você acertou todas as ${getRoundSize(state.currentLevel)} imagens. A rodada 2 é obrigatória.`
          : 'É preciso acertar todas as imagens para subir de nível. Tente novamente.',
        primaryLabel: perfectRound1 ? 'Iniciar rodada 2' : 'Tentar novamente',
        secondaryLabel: perfectRound1 ? 'Refazer rodada 1' : '',
        onPrimary: () => {
          hideFeedback();
          startRound(perfectRound1 ? 2 : 1);
        },
        onSecondary: perfectRound1
          ? () => {
              hideFeedback();
              startRound(1);
            }
          : null
      });
      return;
    }

    const nextLevel = Math.min(state.currentLevel + 1, LEVEL_SIZES.length);
    const canAdvance = state.round1Passed && state.currentLevel < LEVEL_SIZES.length;
    const reachedLastLevel = state.currentLevel === LEVEL_SIZES.length && !canAdvance;
    const primaryLabel = canAdvance
      ? `Jogar nível ${nextLevel}`
      : `Repetir nível ${state.currentLevel}`;
    const description = state.round1Passed
      ? reachedLastLevel
        ? 'Você completou o último nível. Continue praticando estas imagens sempre que quiser.'
        : `Rodada obrigatória concluída. Prepare-se para as próximas ${getRoundSize(nextLevel)} imagens.`
      : 'Para avançar de nível, finalize a Rodada 1 sem erros e refaça esta rodada se quiser treinar mais.';

    showFeedback({
      title: state.currentLevel === LEVEL_SIZES.length && canAdvance === false
        ? 'Rodada 2 concluída'
        : roundTitle,
      description,
      primaryLabel,
      secondaryLabel: 'Repetir rodada 2',
      onPrimary: () => {
        hideFeedback();
        if (canAdvance) {
          state.currentLevel = nextLevel;
          localStorage.setItem('imageGameLevel', String(state.currentLevel));
          state.round1Passed = false;
          updateHeaderLevel();
        }
        startRound(1);
      },
      onSecondary: () => {
        hideFeedback();
        startRound(2);
      }
    });
  };

  const startRound = (round = 1) => {
    if (round === 2 && !state.round1Passed) {
      showStatus('Conclua a Rodada 1 sem erros para liberar a Rodada 2.', 'warning');
      return;
    }

    hideFeedback();
    state.round = round;
    state.index = 0;
    if (round === 1) {
      state.round1Passed = false;
    }
    state.items = getRoundItems(round);
    state.preloaded.clear();
    resetRoundStats();
    updateRoundLabel();

    if (!state.items.length) {
      showStatus('Nenhuma imagem encontrada para esta rodada.', 'warning');
      return;
    }

    if (elements.instruction) {
      elements.instruction.textContent =
        round === 1
          ? 'Revise as 25 imagens mais recentes e marque se acertou ou errou.'
          : 'Rodada obrigatória: marque se acertou ou errou as imagens já desbloqueadas.';
    }

    state.roundComplete = false;
    updateImage({ animateIn: true });
    showStatus('');
  };

  const startLevel = (level = 1) => {
    const normalizedLevel = Math.min(Math.max(level, 1), LEVEL_SIZES.length);
    state.currentLevel = normalizedLevel;
    state.round1Passed = false;
    syncLevelSlider(normalizedLevel);
    updateActiveWordCount();
    updateHeaderLevel();
    startRound(1);
  };

  const startImageGame = () => {
    if (!state.allItems.length) {
      showStatus('Nenhuma imagem encontrada.', 'warning');
      return;
    }

    const selectedLevel = getSelectedLevel();
    const activeFolders = state.activeFolders && state.activeFolders.size
      ? state.activeFolders
      : new Set();

    const filteredByFolder = state.allItems.filter((item) => activeFolders.has(item.folder || 'objetos'));

    if (!filteredByFolder.length) {
      showStatus('Selecione pelo menos uma pasta para iniciar.', 'warning');
      return;
    }

    const filteredByLevel = filteredByFolder.filter((item) => getItemLevel(item) <= selectedLevel);

    if (!filteredByLevel.length) {
      showStatus('Nenhuma imagem disponível para este nível. Aumente o nível ou escolha outra pasta.', 'warning');
      return;
    }

    state.filteredItems = filteredByLevel;
    state.levelBlocks = buildLevelBlocks(filteredByLevel);
    state.items = [];
    state.index = 0;
    state.round = 1;
    state.round1Passed = false;
    state.currentLevel = selectedLevel;
    localStorage.setItem('imageGameLevel', String(selectedLevel));
    updateHeaderLevel();
    setPlayingLayout(true);
    startLevel(selectedLevel);
  };

  const handleSpeechResult = (event) => {
    if (!event || !event.results || !event.results[0] || !event.results[0][0]) return;
    const transcript = event.results[0][0].transcript || '';
    showTranscript(transcript);

    const current = state.items[state.index];
    if (!current) return;

    const expected = normalizeText(current.en);
    const said = normalizeText(transcript);

    if (!expected) {
      showStatus('Nenhuma palavra cadastrada para esta imagem.', 'warning');
      return;
    }

    if (isCloseMatch(expected, said)) {
      showStatus('Correto!', 'success');
      registerAnswer(true);
      stopListening();
      return;
    }

    showStatus('Fale novamente para comparar com o inglês.', 'info');
    stopListening();
  };

  const handleSpeechError = (event) => {
    const code = event && event.error ? event.error : 'error';
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      showStatus('Permita o microfone para jogar.', 'warning');
      return;
    }
    if (code === 'not-supported') {
      showStatus('Reconhecimento de voz indisponível neste navegador.', 'warning');
      return;
    }
    if (code === 'no-speech') {
      showStatus('Não escutei sua voz. Tente novamente.', 'warning');
      return;
    }
    showStatus('Não foi possível ouvir agora.', 'warning');
  };

  const ensureRecognizer = () => {
    if (state.recognizer) return state.recognizer;
    if (typeof window.KitSpeechRecognizer !== 'function') return null;
    state.recognizer = new window.KitSpeechRecognizer({ lang: 'en-US' });
    state.recognizer.onstart = () => {
      setListeningState(true);
      showStatus('Ouvindo...', 'info');
    };
    state.recognizer.onresult = handleSpeechResult;
    state.recognizer.onerror = handleSpeechError;
    state.recognizer.onend = () => {
      setListeningState(false);
    };
    return state.recognizer;
  };

  const startListening = () => {
    if (state.listening) return;
    const recognizer = ensureRecognizer();
    if (!recognizer) {
      showStatus('Reconhecimento de voz não disponível.', 'warning');
      return;
    }
    recognizer.start();
  };

  const stopListening = () => {
    if (!state.recognizer || !state.listening) return;
    state.recognizer.stop();
  };

  const speakCurrentWord = () => {
    const current = state.items[state.index];
    if (!current || !current.en) return;

    if (!('speechSynthesis' in window)) {
      showStatus('Síntese de voz não disponível.', 'warning');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(current.en);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.onstart = () => showStatus('');
    utterance.onerror = () => showStatus('Não foi possível reproduzir a voz.', 'warning');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const bindImageGestures = () => {
    if (!elements.target) return;
    const gesture = { startX: 0, startY: 0, startTime: 0, pointerId: null };
    const swipeThreshold = 40;

    elements.target.addEventListener('pointerdown', (event) => {
      gesture.pointerId = event.pointerId;
      gesture.startX = event.clientX;
      gesture.startY = event.clientY;
      gesture.startTime = Date.now();
      startListening();
    });

    elements.target.addEventListener('pointerup', (event) => {
      if (gesture.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
      const elapsed = Date.now() - gesture.startTime;
      const isSwipeLeft = deltaX < -swipeThreshold && Math.abs(deltaY) < 80;
      const isSwipeDown = deltaY > swipeThreshold && Math.abs(deltaX) < 80;

      if (isSwipeLeft) {
        stopListening();
        registerAnswer(true);
        return;
      }

      if (isSwipeDown) {
        stopListening();
        showPhrase('en');
        return;
      }

      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && elapsed < 500) {
        startListening();
      }
    });
  };

  const bindEvents = () => {
    if (elements.audioButton) {
      elements.audioButton.addEventListener('click', () => speakCurrentWord());
    }
    if (elements.translateButton) {
      elements.translateButton.addEventListener('click', () => {
        if (!elements.english) return;
        const shouldShow = elements.english.hasAttribute('hidden');
        if (shouldShow) {
          showPhrase('en');
        } else {
          hidePhrase();
        }
      });
    }
    if (elements.english) {
      elements.english.addEventListener('click', () => {
        togglePhraseLanguage();
      });
    }
    if (elements.correctButton) {
      elements.correctButton.addEventListener('click', () => registerAnswer(true));
    }
    if (elements.wrongButton) {
      elements.wrongButton.addEventListener('click', () => registerAnswer(false));
    }
    if (elements.feedbackPrimary) {
      elements.feedbackPrimary.addEventListener('click', () => {
        if (state.feedbackHandlers.primary) {
          state.feedbackHandlers.primary();
        }
      });
    }
    if (elements.feedbackSecondary) {
      elements.feedbackSecondary.addEventListener('click', () => {
        if (state.feedbackHandlers.secondary) {
          state.feedbackHandlers.secondary();
        }
      });
    }
    if (elements.startButton) {
      elements.startButton.addEventListener('click', () => {
        startImageGame();
      });
    }
    if (elements.levelSlider) {
      elements.levelSlider.addEventListener('input', () => {
        const value = getSelectedLevel();
        updateLevelValue(value);
        updateActiveWordCount();
      });
    }
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        registerAnswer(true);
      }
      if (event.key === 'ArrowDown') {
        showPhrase('en');
      }
    });
    bindImageGestures();
  };

  const loadItems = async () => {
    try {
      const response = await fetch('images/images.json', { cache: 'no-store' });
      const data = await response.json();
      state.allItems = (Array.isArray(data) ? data : [])
        .map(parseItem)
        .filter((entry) => entry && entry.file);

      if (!state.allItems.length) {
        showStatus('Nenhuma imagem encontrada.', 'warning');
        return;
      }

      state.filteredItems = [...state.allItems];
      const summary = buildFolderSummary(state.allItems);
      renderFolderButtons(summary);
      updateActiveWordCount();
      if (elements.instruction) {
        elements.instruction.textContent =
          'Selecione as pastas desejadas e toque em “Iniciar imagens”.';
      }
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      showStatus('Erro ao carregar as imagens.', 'warning');
    }
  };

  const init = () => {
    if (elements.target) {
      elements.target.classList.add(hiddenClass);
    }
    setPlayingLayout(false);
    const savedLevel = parseInt(localStorage.getItem('imageGameLevel') || '1', 10);
    const initialLevel = Number.isFinite(savedLevel) ? Math.min(Math.max(savedLevel, 1), MAX_LEVEL) : 1;
    state.currentLevel = initialLevel;
    syncLevelSlider(initialLevel);
    bindEvents();
    loadItems();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
