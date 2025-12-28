(function () {
  const STORAGE_KEY = 'vocabulary-level';
  const board = document.getElementById('board');
  const boardInner = document.getElementById('board-inner');
  const textContainer = document.getElementById('text-container');
  const choiceRow = document.getElementById('choice-row');
  const progressFill = document.getElementById('progress-fill');
  const phaseLabel = document.getElementById('phase-label');
  const levelBadge = document.getElementById('level-indicator');
  const preGame = document.getElementById('pre-game');
  const preGameLevel = document.getElementById('pre-game-level');
  const startBtn = document.getElementById('start-btn');
  const levelComplete = document.getElementById('level-complete');
  const levelCompleteText = document.getElementById('level-complete-text');
  const nextLevelBtn = document.getElementById('next-level-btn');
  const PHASE_DISSOLVE_MS = 500;

  const faseAudios = {
    1: document.getElementById('audio-fase1'),
    2: document.getElementById('audio-fase2'),
    3: document.getElementById('audio-fase3')
  };
  const successAudio = document.getElementById('audio-success');
  const errorAudio = document.getElementById('audio-error');

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
    if (preGameLevel) preGameLevel.textContent = `Nível ${level}`;
  }

  function updatePhaseLabel() {
    if (phaseLabel) phaseLabel.textContent = `Fase ${phase}`;
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

  function filterPool() {
    const numericLevel = Number(level) || 1;
    pool = images.filter(item => Number(item.level) === numericLevel);
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
    return new Promise(resolve => {
      const audio = faseAudios[nextPhase];
      if (!audio) {
        resolve();
        return;
      }
      const finish = () => {
        audio.removeEventListener('ended', finish);
        audio.removeEventListener('error', finish);
        resolve();
      };

      audio.currentTime = 0;
      audio.addEventListener('ended', finish);
      audio.addEventListener('error', finish);
      audio.play().catch(finish);
    });
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
    img.src = `images/${item.file}`;
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
    audio && audio.play().catch(() => {});
    setTimeout(() => {
      awaiting = false;
      advanceCycle();
    }, 1000);
  }

  function buildPhaseTwoOptions(item) {
    const wrongPool = pool.filter(entry => entry.file !== item.file);
    const wrongChoices = shuffle(wrongPool).slice(0, 3);

    while (wrongChoices.length < 3 && wrongPool.length) {
      const filler = wrongPool[Math.floor(Math.random() * wrongPool.length)];
      wrongChoices.push(filler);
    }

    while (wrongChoices.length < 3) {
      wrongChoices.push(item);
    }

    const options = [
      { ...item, correct: true },
      ...wrongChoices.slice(0, 3).map(choice => ({ ...choice, correct: false }))
    ];

    return shuffle(options).slice(0, 4);
  }

  function showPhaseTwoCards(item) {
    currentItem = item;
    clearBoard();
    boardInner.classList.add('board__inner--grid');
    const selection = buildPhaseTwoOptions(item);

    selection.forEach(entry => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'grid-card grid-card--enter';
      card.dataset.correct = String(entry.correct === true);
      const img = document.createElement('img');
      img.src = `images/${entry.file}`;
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
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }
    const img = document.createElement('img');
    img.src = `images/${item.file}`;
    img.alt = item.en;
    img.className = 'board__image-single';
    img.style.opacity = '0.8';
    boardInner.appendChild(img);
    const promptText = 'Toque na imagem e fale em inglês.';
    showText(promptText);
    const handler = () => {
      img.style.opacity = '1';
      handlePhaseThreeSpeak(item.en, handler);
    };
    img.addEventListener('click', handler);
  }

  function normalizeText(text) {
    return (text || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  }

  function handlePhaseThreeSpeak(expected, handler) {
    if (awaiting) return;
    awaiting = true;
    let resolved = false;
    const onResult = (spoken) => {
      if (resolved) return;
      resolved = true;
      const cleanExpected = normalizeText(expected);
      const cleanSpoken = normalizeText(spoken);
      const success = cleanSpoken.includes(cleanExpected);

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
      img.src = `images/${entry.file}`;
      img.alt = entry.en;
      card.appendChild(img);
      boardInner.appendChild(card);
    });

    speak(target.en);
  }

  function handleProgressCompletion() {
    if (phase === 1) {
      awaiting = true;
      completionGridShown = true;
      clearBoard();
      showText('');
      if (choiceRow) choiceRow.innerHTML = '';
      hidePhaseElements();
      setTimeout(() => {
        awaiting = false;
        handlePhaseComplete();
      }, PHASE_DISSOLVE_MS);
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

  async function startPhase(nextPhase) {
    phase = nextPhase;
    updatePhaseLabel();
    filterPool();
    resetProgress();
    preparePhaseIntro();
    await playPhaseIntro(nextPhase);
    advanceCycle();
    requestAnimationFrame(() => {
      showPhaseElements();
    });
  }

  function handlePhaseComplete() {
    if (phase === 3) {
      level += 1;
      saveLevelToStorage();
      updateLevelIndicators();
      levelCompleteText.textContent = `Você concluiu o nível ${level - 1}. Vamos para o nível ${level}?`;
      levelComplete.classList.remove('hidden');
      return;
    }

    dissolveEnvironment(() => {
      startPhase(phase + 1);
    });
  }

  function startGame() {
    preGame.classList.add('hidden');
    startPhase(1);
  }

  function init() {
    loadLevelFromStorage();
    updatePhaseLabel();
    setupSpeechRecognition();
    loadImages();
    startBtn.addEventListener('click', () => {
      loadImages().then(startGame);
    });
    nextLevelBtn.addEventListener('click', () => {
      levelComplete.classList.add('hidden');
      phase = 1;
      updatePhaseLabel();
      preGame.classList.remove('hidden');
      updateLevelIndicators();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
