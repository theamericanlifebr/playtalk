(() => {
  const SUCCESS_AUDIO = new Audio('gamesounds/success.mp3');
  const ERROR_AUDIO = new Audio('gamesounds/error.mp3');
  const TRANSITION_AUDIO = new Audio('gamesounds/report.wav');

  const PHASES = {
    1: 'Escolha a palavra correta que você ouviu.',
    2: 'Toque a imagem que corresponde ao áudio.',
    3: 'Fale em inglês o que vê na imagem.'
  };

  const state = {
    allItems: [],
    items: [],
    pending: [],
    currentItem: null,
    phase: 1,
    level: 1,
    cycleCorrect: 0,
    cycleErrors: 0,
    listening: false,
    recognizer: null,
    blockInput: false
  };

  const elements = {
    instruction: document.getElementById('image-game-instruction'),
    target: document.getElementById('image-game-target'),
    status: document.getElementById('image-game-status'),
    transcript: document.getElementById('image-game-transcript'),
    english: document.getElementById('image-game-english'),
    roundLabel: document.getElementById('image-game-round-label'),
    counts: document.getElementById('image-game-counts'),
    progressBar: document.getElementById('image-game-progress-bar'),
    progressLabel: document.getElementById('image-game-progress-label'),
    feedback: document.getElementById('image-game-feedback'),
    feedbackTitle: document.getElementById('image-game-feedback-title'),
    feedbackDescription: document.getElementById('image-game-feedback-description'),
    feedbackCorrect: document.getElementById('image-game-feedback-correct'),
    feedbackErrors: document.getElementById('image-game-feedback-errors'),
    feedbackPrimary: document.getElementById('image-game-feedback-primary'),
    feedbackSecondary: document.getElementById('image-game-feedback-secondary'),
    headerLevel: document.getElementById('header-level'),
    startButton: document.getElementById('image-game-start'),
    levelValue: document.getElementById('image-game-level-value'),
    phase1Options: document.getElementById('phase1-options'),
    phase2Grid: document.getElementById('phase2-grid'),
    phase3Hint: document.getElementById('phase3-hint'),
    gameMain: document.getElementById('game-main')
  };

  const shuffle = (list) => {
    const array = [...list];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const normalizeText = (value) => (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s'-]/g, '')
    .trim();

  const playSound = (audio) => {
    try {
      audio.currentTime = 0;
      audio.play();
    } catch (error) {
      // ignore
    }
  };

  const speakWord = (word) => {
    if (!('speechSynthesis' in window) || !word) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const showStatus = (message, tone = '') => {
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.dataset.tone = tone;
  };

  const updateHeaderLevel = () => {
    if (elements.headerLevel) {
      elements.headerLevel.textContent = `Nível ${state.level}`;
    }
    if (elements.levelValue) {
      elements.levelValue.textContent = state.level;
    }
  };

  const updatePhaseDisplay = () => {
    // Phase details no longer displayed on screen, but keep state updated
  };

  const updateCounts = () => {
    if (!elements.counts) return;
    elements.counts.textContent = `${state.cycleCorrect} acertos · ${state.cycleErrors} erros`;
  };

  const updateProgress = () => {
    if (!elements.progressBar || !elements.progressLabel) return;
    const total = state.items.length || 1;
    const percent = Math.round((state.cycleCorrect / total) * 100);
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.setAttribute('aria-valuenow', String(percent));
    elements.progressBar.setAttribute('aria-valuetext', `${state.cycleCorrect} de ${total}`);
    elements.progressLabel.textContent = `${state.cycleCorrect}/${total}`;
  };

  const resetVisualState = () => {
    elements.phase1Options?.setAttribute('hidden', '');
    elements.phase2Grid?.setAttribute('hidden', '');
    elements.phase3Hint?.setAttribute('hidden', '');
    if (elements.english) elements.english.setAttribute('hidden', '');
    showStatus('');
    elements.transcript && (elements.transcript.textContent = '');
    if (elements.target) {
      elements.target.classList.remove('is-engaged');
      elements.target.style.opacity = '1';
    }
  };

  const updateImage = () => {
    if (!elements.target || !state.currentItem) return;
    elements.target.src = `images/${state.currentItem.file}`;
    elements.target.alt = state.currentItem.pt || 'Imagem do jogo';
  };

  const getRandomOtherWord = (exclude) => {
    const pool = state.items.filter((item) => item.en !== exclude);
    if (!pool.length) return exclude;
    return pool[Math.floor(Math.random() * pool.length)].en;
  };

  const getRandomDistractors = (count, excludeFile) => {
    const pool = state.items.filter((item) => item.file !== excludeFile);
    return shuffle(pool).slice(0, count);
  };

  const getItemsForLevel = (level) => {
    const currentLevel = Number(level);
    if (Number.isNaN(currentLevel)) return [];
    return state.allItems.filter((entry) => Number(entry.level) === currentLevel);
  };

  const markCycleCompletion = () => {
    if (state.phase < 3) {
      state.phase += 1;
      startPhase(state.phase);
      return;
    }
    finishLevel();
  };

  const handlePhaseComplete = () => {
    if (state.pending.length === 0) {
      markCycleCompletion();
    }
  };

  const setPendingFromItems = () => {
    state.pending = shuffle(state.items);
    state.cycleCorrect = 0;
    state.cycleErrors = 0;
    updateCounts();
    updateProgress();
  };

  const handlePhase1Answer = (isCorrect, clicked, correctButton) => {
    if (state.blockInput) return;
    state.blockInput = true;
    if (isCorrect) {
      playSound(SUCCESS_AUDIO);
      clicked.classList.add('is-correct');
      state.cycleCorrect += 1;
      state.pending.shift();
    } else {
      playSound(ERROR_AUDIO);
      clicked.classList.add('is-wrong');
      correctButton.classList.add('is-correct');
      state.cycleErrors += 1;
      state.pending.push(state.pending.shift());
    }
    updateCounts();
    updateProgress();
    setTimeout(() => {
      state.blockInput = false;
      loadPhase1Step();
    }, 900);
  };

  const renderPhase1Options = () => {
    if (!elements.phase1Options || !state.currentItem) return;
    elements.phase1Options.innerHTML = '';
    const distractor = getRandomOtherWord(state.currentItem.en);
    const options = shuffle([state.currentItem.en, distractor]);
    const buttons = options.map((text) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'phase-option-button';
      btn.textContent = text;
      elements.phase1Options.appendChild(btn);
      return btn;
    });
    const correctButton = buttons[options.indexOf(state.currentItem.en)];
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => handlePhase1Answer(btn === correctButton, btn, correctButton));
    });
    elements.phase1Options.removeAttribute('hidden');
  };

  const loadPhase1Step = () => {
    if (!state.pending.length) {
      handlePhaseComplete();
      return;
    }
    state.currentItem = state.pending[0];
    updateImage();
    if (elements.target) {
      elements.target.style.opacity = '1';
    }
    renderPhase1Options();
    speakWord(state.currentItem.en);
    playSound(TRANSITION_AUDIO);
  };

  const handlePhase2Selection = (button, isCorrect) => {
    if (state.blockInput) return;
    state.blockInput = true;
    button.classList.add('is-engaged');
    button.style.opacity = '1';
    if (isCorrect) {
      playSound(SUCCESS_AUDIO);
      state.cycleCorrect += 1;
      state.pending.shift();
    } else {
      playSound(ERROR_AUDIO);
      state.cycleErrors += 1;
      state.pending.push(state.pending.shift());
    }
    updateCounts();
    setTimeout(() => {
      state.blockInput = false;
      loadPhase2Step();
    }, 1000);
  };

  const renderPhase2Grid = () => {
    if (!elements.phase2Grid || !state.currentItem) return;
    elements.phase2Grid.innerHTML = '';
    const distractors = getRandomDistractors(3, state.currentItem.file);
    const options = shuffle([state.currentItem, ...distractors]);
    options.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'phase-grid-button';
      const img = document.createElement('img');
      img.src = `images/${item.file}`;
      img.alt = item.pt || 'Imagem do jogo';
      img.style.opacity = '0.9';
      btn.appendChild(img);
      btn.addEventListener('click', () => handlePhase2Selection(btn, item.file === state.currentItem.file));
      elements.phase2Grid.appendChild(btn);
    });
    elements.phase2Grid.removeAttribute('hidden');
  };

  const loadPhase2Step = () => {
    if (!state.pending.length) {
      handlePhaseComplete();
      return;
    }
    state.currentItem = state.pending[0];
    updateImage();
    if (elements.target) {
      elements.target.style.opacity = '0.9';
    }
    renderPhase2Grid();
    speakWord(state.currentItem.en);
    playSound(TRANSITION_AUDIO);
  };

  const ensureRecognizer = () => {
    if (state.recognizer || typeof window.KitSpeechRecognizer !== 'function') return state.recognizer;
    state.recognizer = new window.KitSpeechRecognizer({ lang: 'en-US' });
    state.recognizer.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      elements.transcript && (elements.transcript.textContent = transcript);
      const expected = normalizeText(state.currentItem?.en);
      const said = normalizeText(transcript);
      if (!expected) return;
      if (expected === said) {
        playSound(SUCCESS_AUDIO);
        state.cycleCorrect += 1;
        state.pending.shift();
        updateCounts();
        updateProgress();
        setTimeout(() => loadPhase3Step(), 500);
      } else {
        playSound(ERROR_AUDIO);
        state.cycleErrors += 1;
        state.pending.push(state.pending.shift());
        updateCounts();
        setTimeout(() => loadPhase3Step(), 700);
      }
    };
    state.recognizer.onerror = () => {
      showStatus('Não foi possível ouvir agora.', 'warning');
      state.listening = false;
    };
    state.recognizer.onstart = () => {
      state.listening = true;
      showStatus('Ouvindo...', 'info');
    };
    state.recognizer.onend = () => {
      state.listening = false;
      if (elements.target) elements.target.classList.remove('is-engaged');
    };
    return state.recognizer;
  };

  const startListening = () => {
    const recognizer = ensureRecognizer();
    if (!recognizer) {
      showStatus('Reconhecimento de voz não disponível.', 'warning');
      return;
    }
    recognizer.start();
  };

  const loadPhase3Step = () => {
    if (!state.pending.length) {
      handlePhaseComplete();
      return;
    }
    state.currentItem = state.pending[0];
    updateImage();
    if (elements.target) {
      elements.target.style.opacity = '0.85';
    }
    elements.phase3Hint?.removeAttribute('hidden');
    speakWord(state.currentItem.en);
    playSound(TRANSITION_AUDIO);
  };

  const bindPhase3Interaction = () => {
    if (!elements.target) return;
    elements.target.addEventListener('click', () => {
      if (!state.currentItem || state.blockInput) return;
      elements.target.style.opacity = '1';
      elements.target.classList.add('is-engaged');
      startListening();
    });
  };

  const startPhase = (phase) => {
    state.phase = phase;
    resetVisualState();
    setPendingFromItems();
    updatePhaseDisplay();
    if (elements.instruction) {
      elements.instruction.textContent = `Fase ${phase}/3 · ${PHASES[phase] || ''}`;
    }
    if (elements.roundLabel) {
      elements.roundLabel.textContent = `Fase ${phase}`;
    }
    if (phase === 1) {
      loadPhase1Step();
    } else if (phase === 2) {
      loadPhase2Step();
    } else {
      loadPhase3Step();
    }
  };

  const finishLevel = () => {
    if (elements.gameMain) {
      elements.gameMain.setAttribute('hidden', '');
    }
    elements.feedbackTitle && (elements.feedbackTitle.textContent = `Nível ${state.level} concluído!`);
    elements.feedbackDescription && (elements.feedbackDescription.textContent = 'Você finalizou todas as fases deste nível.');
    elements.feedbackCorrect && (elements.feedbackCorrect.textContent = String(state.cycleCorrect));
    elements.feedbackErrors && (elements.feedbackErrors.textContent = String(state.cycleErrors));
    if (elements.feedbackPrimary) {
      elements.feedbackPrimary.textContent = `Iniciar nível ${state.level + 1}`;
      elements.feedbackPrimary.onclick = () => {
        elements.gameMain?.removeAttribute('hidden');
        state.level += 1;
        state.items = getItemsForLevel(state.level);
        updateHeaderLevel();
        startLevel();
      };
    }
    if (elements.feedbackSecondary) {
      elements.feedbackSecondary.textContent = 'Voltar ao menu';
      elements.feedbackSecondary.onclick = () => {
        window.location.href = 'index.html';
      };
      elements.feedbackSecondary.removeAttribute('hidden');
    }
    elements.feedback?.removeAttribute('hidden');
  };

  const startLevel = () => {
    state.items = getItemsForLevel(state.level);
    if (!state.items.length) {
      showStatus('Nenhuma imagem encontrada para este nível.', 'warning');
      return;
    }
    elements.feedback?.setAttribute('hidden', '');
    elements.gameMain?.removeAttribute('hidden');
    state.phase = 1;
    setPendingFromItems();
    updateHeaderLevel();
    startPhase(1);
  };

  const loadItems = async () => {
    try {
      const response = await fetch('images/images.json', { cache: 'no-store' });
      const data = await response.json();
      state.allItems = Array.isArray(data)
        ? data.filter((entry) => entry && entry.file && entry.en)
        : [];
      state.items = getItemsForLevel(state.level);
      if (!state.items.length) {
        showStatus('Nenhuma imagem encontrada para este nível.', 'warning');
        return;
      }
      showStatus('Pronto para começar!', 'info');
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      showStatus('Erro ao carregar as imagens.', 'warning');
    }
  };

  const bindEvents = () => {
    elements.startButton?.addEventListener('click', () => startLevel());
    elements.feedbackPrimary?.addEventListener('click', () => {});
    elements.feedbackSecondary?.addEventListener('click', () => {});
    bindPhase3Interaction();
  };

  const init = () => {
    updateHeaderLevel();
    updatePhaseDisplay();
    updateCounts();
    updateProgress();
    bindEvents();
    loadItems();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
