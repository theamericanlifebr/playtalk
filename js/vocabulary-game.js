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
  const nextLevelBtn = document.getElementById('next-level-btn');
  const phaseTransition = document.getElementById('phase-transition');
  const phaseTransitionTitle = document.getElementById('phase-transition-title');
  const phaseTransitionBtn = document.getElementById('phase-transition-btn');
  const progressCompleteOverlay = document.getElementById('progress-complete-overlay');
  const PHASE_DISSOLVE_MS = 500;

  const faseAudios = {
    1: document.getElementById('audio-abertura'),
    2: document.getElementById('audio-fase2'),
    3: document.getElementById('audio-fase3'),
    4: document.getElementById('audio-fase4')
  };
  const successAudio = document.getElementById('audio-success');
  const errorAudio = document.getElementById('audio-error');
  const conclusionAudio = document.getElementById('audio-conclusao');

  let images = [];
  let level = 1;
  let phase = 1;
  let pool = [];
  let cycle = [];
  let index = 0; // posição atual no ciclo
  let score = 0; // progresso / acertos
  let currentItem = null;
  let completionGridShown = false;

  let awaiting = false;
  let recognition = null;
  let loadPromise = null;
  let rotationTimer = null;
  let rotationIndex = 0;
  let gameStarted = false;
  const ROTATION_FADE_MS = 400;

  function playAudioElement(audio) {
    return new Promise(resolve => {
      if (!audio) {
        resolve(false);
        return;
      }

      let hasPlayed = false;

      const markPlayed = () => {
        hasPlayed = true;
      };

      const finish = () => {
        audio.removeEventListener('playing', markPlayed);
        audio.removeEventListener('ended', finish);
        audio.removeEventListener('error', finish);
        resolve(hasPlayed);
      };

      audio.currentTime = 0;
      audio.addEventListener('playing', markPlayed);
      audio.addEventListener('ended', finish);
      audio.addEventListener('error', finish);

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

  function loadLevelFromStorage() {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    level = Number.isFinite(stored) && stored > 0 ? stored : 1;
    updateLevelIndicators();
  }

  function saveLevelToStorage() {
    localStorage.setItem(STORAGE_KEY, String(level));
  }

  function updateLevelIndicators() {
    if (levelBadge) levelBadge.textContent = `Nível ${level}`;
  }

  function updatePhaseLabel() {
    if (phaseLabel) phaseLabel.textContent = `Fase ${phase}`;
  }

  function applyBoardSizing(targetPhase) {
    if (!board) return;
    const shouldExpand = targetPhase === 3 || targetPhase === 4;
    board.classList.toggle('board--expanded', shouldExpand);
  }

  async function loadImages() {
    if (loadPromise) return loadPromise;
    loadPromise = fetch('images/images.json')
      .then(response => response.json())
      .then(data => {
        images = Array.isArray(data) ? data : [];
        filterPool();
        resetProgress();
      })
      .catch(() => {
        images = [];
        pool = [];
      });
    return loadPromise;
  }

  function buildImageSrc(entry) {
    const fileName = entry?.file;
    if (!fileName) return '';
    const levelFolder = entry?.level ? String(entry.level) : '';
    return levelFolder ? `images/${levelFolder}/${fileName}` : `images/${fileName}`;
  }

  function filterPool() {
    const numericLevel = Math.max(1, Number(level) || 1);
    const minLevel = (numericLevel - 1) * 5 + 1;
    const maxLevel = minLevel + 4;
    pool = images.filter(item => {
      const itemLevel = Number(item.level) || 0;
      return itemLevel >= minLevel && itemLevel <= maxLevel;
    });
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
    currentItem = null;
    completionGridShown = false;
    cycle = shuffle(pool);

    if (!cycle.length) {
      showText('Nenhuma imagem disponível para este nível.');
    }

    updateProgressBar();
  }

  function updateProgressBar() {
    if (!progressFill) return;
    const total = Math.max(cycle.length, 1);
    const percent = Math.min(100, Math.round((score / total) * 100));
    progressFill.style.width = `${percent}%`;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function showText(message) {
    if (!textContainer) return;
    textContainer.textContent = message || '';
    textContainer.classList.toggle('active', Boolean(message));
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

  function playPhaseIntro(nextPhase) {
    return playAudioElement(faseAudios[nextPhase]);
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
    const img = document.createElement('img');
    img.src = buildImageSrc(item);
    img.alt = item.en;
    img.className = 'board__image-single';
    boardInner.appendChild(img);

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
    });
  }

  function handlePhaseOneChoice(btn, correct) {
    if (awaiting) return;
    awaiting = true;
    choiceRow.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const audio = correct ? successAudio : errorAudio;

    if (correct) {
      btn.classList.add('success');
      score += 1;
      index += 1;
    } else {
      btn.classList.add('error');
      score = 0;
      index = 0;
      cycle = shuffle(pool);
    }

    updateProgressBar();
    speak(currentItem.en);
    audio && audio.play().catch(() => {});
    setTimeout(() => {
      awaiting = false;
      advanceCycle();
    }, 1000);
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
      const img = document.createElement('img');
      img.src = buildImageSrc(entry);
      img.alt = entry.en;
      card.appendChild(img);
      card.addEventListener('click', () => handlePhaseTwoChoice(card));
      boardInner.appendChild(card);
    });

    speak(item.en);
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
    const audio = isCorrect ? successAudio : errorAudio;
    highlightCorrectCard();
    if (!isCorrect) {
      card.classList.add('grid-card--wrong');
    }

    boardInner.querySelectorAll('.grid-card').forEach(btn => { btn.disabled = true; });

    if (isCorrect) {
      score += 1;
      index += 1;
    } else {
      score = 0;
      index = 0;
      cycle = shuffle(pool);
    }

    audio && audio.play().catch(() => {});
    updateProgressBar();
    setTimeout(() => {
      awaiting = false;
      advanceCycle();
    }, 1000);
  }

  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
    }
  }

  function showPhaseThreeCard(item) {
    currentItem = item;
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    boardInner.classList.add('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const selection = buildPhaseOptions(item, 6);

    selection.forEach(entry => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'grid-card grid-card--enter';
      card.dataset.correct = String(entry.correct === true);
      const img = document.createElement('img');
      img.src = buildImageSrc(entry);
      img.alt = entry.en;
      card.appendChild(img);
      card.addEventListener('click', () => handlePhaseTwoChoice(card));
      boardInner.appendChild(card);
    });

    showText('');
    speak(item.en);
  }

  function normalizeText(text) {
    return (text || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  }

  function levenshteinDistance(a, b) {
    if (a === b) return 0;
    const aLen = a.length;
    const bLen = b.length;

    if (aLen === 0) return bLen;
    if (bLen === 0) return aLen;

    const matrix = Array.from({ length: aLen + 1 }, () => new Array(bLen + 1).fill(0));

    for (let i = 0; i <= aLen; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= bLen; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= aLen; i += 1) {
      for (let j = 1; j <= bLen; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[aLen][bLen];
  }

  function isSpokenCorrect(expected, spoken) {
    const cleanExpected = normalizeText(expected);
    const cleanSpoken = normalizeText(spoken);

    if (!cleanSpoken) return false;
    if (cleanSpoken.includes(cleanExpected) || cleanExpected.includes(cleanSpoken)) return true;

    const prefix = cleanExpected.slice(0, 2);
    if (prefix && cleanSpoken.startsWith(prefix)) return true;

    for (let i = 0; i <= cleanExpected.length - 3; i += 1) {
      const segment = cleanExpected.slice(i, i + 3);
      if (cleanSpoken.includes(segment)) return true;
    }

    if (levenshteinDistance(cleanExpected, cleanSpoken) <= 2) return true;

    return false;
  }

  function handleSpeechChallenge(expected, handler) {
    if (awaiting) return;
    awaiting = true;
    let resolved = false;
    const onResult = (spoken) => {
      if (resolved) return;
      resolved = true;
      const success = isSpokenCorrect(expected, spoken);

      if (success) {
        score += 1;
        index += 1;
        successAudio && successAudio.play().catch(() => {});
      } else {
        score = 0;
        index = 0;
        cycle = shuffle(pool);
        errorAudio && errorAudio.play().catch(() => {});
      }

      updateProgressBar();
      setTimeout(() => {
        awaiting = false;
        advanceCycle();
      }, 1000);
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

    if (handler) {
      const img = boardInner.querySelector('img');
      if (img) img.removeEventListener('click', handler);
    }
  }

  function showPhaseFourCard(item) {
    currentItem = item;
    clearBoard();
    boardInner.classList.add('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const primaryTargets = buildPhaseOptions(item, 3).map(entry => ({ ...entry, correct: true })).slice(0, 3);
    const orderedTargets = primaryTargets.filter((entry, idx, arr) => arr.findIndex(el => el.file === entry.file) === idx);
    while (orderedTargets.length < 3) {
      orderedTargets.push(item);
    }

    const existingFiles = new Set(orderedTargets.map(entry => entry.file));
    const fillerPool = shuffle(pool.filter(entry => !existingFiles.has(entry.file)));
    const fillers = fillerPool.slice(0, Math.max(0, 6 - orderedTargets.length));
    const selection = shuffle([...orderedTargets, ...fillers]).slice(0, 6);
    let sequenceIndex = 0;

    boardInner.innerHTML = '';
    selection.forEach(entry => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'grid-card grid-card--enter';
      card.dataset.file = entry.file;
      const img = document.createElement('img');
      img.src = buildImageSrc(entry);
      img.alt = entry.en;
      card.appendChild(img);
      card.addEventListener('click', () => {
        if (awaiting) return;
        const expected = orderedTargets[sequenceIndex];
        const isCorrect = expected && card.dataset.file === expected.file;
        if (isCorrect) {
          card.classList.add('grid-card--correct');
          card.disabled = true;
          sequenceIndex += 1;
          if (sequenceIndex >= orderedTargets.length) {
            awaiting = true;
            score += 1;
            index += 1;
            successAudio && successAudio.play().catch(() => {});
            updateProgressBar();
            setTimeout(() => {
              awaiting = false;
              advanceCycle();
            }, 800);
          }
        } else {
          awaiting = true;
          card.classList.add('grid-card--wrong');
          boardInner.querySelectorAll('.grid-card.grid-card--correct').forEach(btn => {
            btn.classList.remove('grid-card--correct');
            btn.disabled = false;
          });
          sequenceIndex = 0;
          score = 0;
          index = 0;
          cycle = shuffle(pool);
          errorAudio && errorAudio.play().catch(() => {});
          updateProgressBar();
          setTimeout(() => {
            awaiting = false;
            advanceCycle();
          }, 1000);
        }
      });
      boardInner.appendChild(card);
    });

    choiceRow.innerHTML = '';
    showText('');
    orderedTargets.forEach((entry, idx) => {
      setTimeout(() => speak(entry.en), idx * 900);
    });
  }

  function advanceCycle() {
    if (!cycle.length) return;

    if (index >= cycle.length) {
      handleProgressCompletion();
      return;
    }

    const item = cycle[index];
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
        showPhaseFourCard(item);
        break;
      default:
        showPhaseOneCard(item);
    }
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
      const img = document.createElement('img');
      img.src = buildImageSrc(entry);
      img.alt = entry.en;
      card.appendChild(img);
      boardInner.appendChild(card);
    });

    speak(target.en);
  }

  function showProgressCompletionOverlay(nextPhase) {
    return new Promise(resolve => {
      if (progressCompleteOverlay) {
        progressCompleteOverlay.classList.add('active');
        progressCompleteOverlay.setAttribute('aria-hidden', 'false');
      }

      playAudioElement(faseAudios[nextPhase]).then(() => {
        if (progressCompleteOverlay) {
          progressCompleteOverlay.classList.remove('active');
          progressCompleteOverlay.setAttribute('aria-hidden', 'true');
        }
        resolve();
      });
    });
  }

  function showPhaseTransition(nextPhase) {
    if (!phaseTransition || !phaseTransitionBtn || !phaseTransitionTitle) {
      startPhase(nextPhase);
      return;
    }

    const config = {
      1: { title: 'Fase 1', cta: 'Iniciar fase 1' },
      2: { title: 'Fase 2', cta: 'Iniciar fase 2' },
      3: { title: 'Fase 3', cta: 'Iniciar fase 3' },
      4: { title: 'Fase 4', cta: 'Iniciar fase 4' }
    }[nextPhase] || {
      title: `Fase ${nextPhase}`,
      cta: 'Continuar'
    };

    phaseTransitionTitle.textContent = config.title;
    phaseTransitionBtn.textContent = config.cta;
    phaseTransition.classList.remove('hidden');
    phaseTransition.setAttribute('aria-hidden', 'false');

    phaseTransitionBtn.disabled = true;
    let audioUnlocked = false;
    let attemptInProgress = false;

    const detachAudioListeners = () => {
      phaseTransition.removeEventListener('click', attemptUnlock);
      phaseTransition.removeEventListener('touchstart', attemptUnlock);
      phaseTransition.removeEventListener('pointerdown', attemptUnlock);
    };

    function attemptUnlock() {
      if (audioUnlocked || attemptInProgress) return;
      attemptInProgress = true;
      playAudioElement(faseAudios[nextPhase]).then((played) => {
        attemptInProgress = false;
        if (!played) return;
        audioUnlocked = true;
        phaseTransitionBtn.disabled = false;
        detachAudioListeners();
      });
    }

    const startNextPhase = () => {
      phaseTransitionBtn.removeEventListener('click', startNextPhase);
      phaseTransition.classList.add('hidden');
      phaseTransition.setAttribute('aria-hidden', 'true');
      startPhase(nextPhase, { skipIntroAudio: true });
    };

    phaseTransitionBtn.addEventListener('click', startNextPhase);
    phaseTransition.addEventListener('click', attemptUnlock);
    phaseTransition.addEventListener('touchstart', attemptUnlock, { passive: true });
    phaseTransition.addEventListener('pointerdown', attemptUnlock);

    attemptUnlock();
  }

  function handleProgressCompletion() {
    if (phase === 1 || phase === 2 || phase === 3) {
      awaiting = false;
      completionGridShown = true;
      clearBoard();
      showText('');
      if (choiceRow) choiceRow.innerHTML = '';
      hidePhaseElements();
      showPhaseTransition(phase + 1);
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
    applyBoardSizing(nextPhase);
    filterPool();
    resetProgress();
    preparePhaseIntro();
    if (!skipIntroAudio) {
      await playPhaseIntro(nextPhase);
    }
    advanceCycle();
    requestAnimationFrame(() => {
      showPhaseElements();
    });
  }

  function handlePhaseComplete(options = {}) {
    const { skipIntroAudio = false } = options;
    if (phase === 4) {
      const completedLevel = level;
      level += 1;
      saveLevelToStorage();
      updateLevelIndicators();
      levelCompleteText.textContent = `Você concluiu o nível ${completedLevel}. Vamos para o nível ${level}?`;
      levelComplete.classList.remove('hidden');
      nextLevelBtn.disabled = true;

      const shouldPlayConclusion = completedLevel === 1 && conclusionAudio;
      const playPromise = shouldPlayConclusion ? playAudioElement(conclusionAudio) : Promise.resolve();

      playPromise.then(() => {
        nextLevelBtn.disabled = false;
      });
      return;
    }

    dissolveEnvironment(() => {
      startPhase(phase + 1, { skipIntroAudio });
    });
  }

  function handleStartInteraction() {
    if (gameStarted) return;
    gameStarted = true;

    if (startScreen) {
      startScreen.classList.add('start-screen--blank');
      startScreen.classList.add('hidden');
    }

    if (rotationTimer) {
      clearInterval(rotationTimer);
      rotationTimer = null;
    }

    loadImages().then(() => {
      showPhaseTransition(1);
    });
  }

  function init() {
    loadLevelFromStorage();
    updatePhaseLabel();
    setupSpeechRecognition();
    loadImages();
    startRotatingText();

    if (startScreen) {
      startScreen.addEventListener('click', handleStartInteraction);
      startScreen.addEventListener('touchstart', handleStartInteraction, { passive: true });
      startScreen.addEventListener('pointerdown', handleStartInteraction);
    }

    nextLevelBtn.addEventListener('click', () => {
      levelComplete.classList.add('hidden');
      phase = 1;
      updatePhaseLabel();
      showPhaseTransition(1);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
