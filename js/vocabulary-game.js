(function() {
  const STORAGE_KEY = 'vocabulary-level';
  const board = document.getElementById('board');
  const boardInner = document.getElementById('board-inner');
  const textContainer = document.getElementById('text-container');
  const choiceRow = document.getElementById('choice-row');
  const progressFill = document.getElementById('progress-fill');
  const levelBadge = document.getElementById('level-indicator');
  const preGame = document.getElementById('pre-game');
  const preGameLevel = document.getElementById('pre-game-level');
  const startBtn = document.getElementById('start-btn');
  const levelComplete = document.getElementById('level-complete');
  const levelCompleteText = document.getElementById('level-complete-text');
  const nextLevelBtn = document.getElementById('next-level-btn');

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
  let progress = 0;
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
    progress = 0;
    updateProgressBar();
    cycle = shuffle(pool);
    if (!cycle.length) {
      showText('Nenhuma imagem disponível para este nível.');
    }
  }

  function updateProgressBar() {
    const total = Math.max(cycle.length, 1);
    const percent = Math.min(100, Math.round((progress / total) * 100));
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
    textContainer.textContent = message || '';
    textContainer.classList.toggle('active', Boolean(message));
  }

  function clearBoard() {
    boardInner.innerHTML = '';
    choiceRow.innerHTML = '';
  }

  function playPhaseIntro(nextPhase) {
    return new Promise(resolve => {
      const audio = faseAudios[nextPhase];
      if (!audio) {
        resolve();
        return;
      }
      board.classList.add('board--hidden');
      showText('');
      choiceRow.innerHTML = '';
      audio.currentTime = 0;
      const onEnded = () => {
        audio.removeEventListener('ended', onEnded);
        board.classList.remove('board--hidden');
        resolve();
      };
      audio.addEventListener('ended', onEnded);
      audio.play().catch(() => resolve());
    });
  }

  function showPhaseOneCard(item) {
    clearBoard();
    const img = document.createElement('img');
    img.src = `images/${item.file}`;
    img.alt = item.en;
    img.className = 'board__image-single';
    boardInner.appendChild(img);

    const wrongPool = pool.filter(entry => entry.file !== item.file);
    const wrongItem = wrongPool.length ? wrongPool[Math.floor(Math.random() * wrongPool.length)] : item;
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
    choiceRow.querySelectorAll('button').forEach(b => b.disabled = true);
    const audio = correct ? successAudio : errorAudio;
    if (correct) {
      btn.classList.add('success');
      progress += 1;
    } else {
      btn.classList.add('error');
      progress = 0;
      cycle = shuffle(pool);
    }
    updateProgressBar();
    audio && audio.play().catch(() => {});
    setTimeout(() => {
      awaiting = false;
      advanceCycle();
    }, 1000);
  }

  function showPhaseTwoCards(item) {
    clearBoard();
    boardInner.style.flexDirection = 'row';
    const wrongChoices = shuffle(pool.filter(entry => entry.file !== item.file)).slice(0, 3);
    const selection = shuffle([item, ...wrongChoices]).slice(0, 4);

    selection.forEach(entry => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'grid-card';
      card.dataset.correct = String(entry.file === item.file);
      const img = document.createElement('img');
      img.src = `images/${entry.file}`;
      img.alt = entry.en;
      card.appendChild(img);
      card.addEventListener('click', () => handlePhaseTwoChoice(card, item.file));
      boardInner.appendChild(card);
    });

    speak(item.en);
  }

  function handlePhaseTwoChoice(card, correctFile) {
    if (awaiting) return;
    awaiting = true;
    const isCorrect = card.dataset.correct === 'true';
    const audio = isCorrect ? successAudio : errorAudio;
    if (isCorrect) {
      progress += 1;
      card.style.background = 'rgba(46, 204, 113, 0.5)';
    } else {
      progress = 0;
      cycle = shuffle(pool);
      card.style.background = 'rgba(231, 76, 60, 0.5)';
      boardInner.querySelectorAll('.grid-card').forEach(btn => {
        if (btn.dataset.correct === 'true') {
          btn.style.background = 'rgba(46, 204, 113, 0.5)';
        }
      });
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
    clearBoard();
    const img = document.createElement('img');
    img.src = `images/${item.file}`;
    img.alt = item.en;
    img.className = 'board__image-single';
    boardInner.appendChild(img);
    const promptText = 'Toque na imagem e fale em inglês.';
    showText(promptText);
    const handler = () => handlePhaseThreeSpeak(item.en, handler);
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
        progress += 1;
        successAudio && successAudio.play().catch(() => {});
      } else {
        progress = 0;
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
    if (progress >= cycle.length) {
      handlePhaseComplete();
      return;
    }
    const item = cycle[progress];
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

  function dissolveEnvironment(callback) {
    board.classList.add('fade-out');
    textContainer.classList.add('fade-out');
    choiceRow.classList.add('fade-out');
    setTimeout(() => {
      board.classList.remove('fade-out');
      textContainer.classList.remove('fade-out');
      choiceRow.classList.remove('fade-out');
      callback();
    }, 500);
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
      phase += 1;
      resetProgress();
      playPhaseIntro(phase).then(() => advanceCycle());
    });
  }

  function startGame() {
    phase = 1;
    filterPool();
    resetProgress();
    preGame.classList.add('hidden');
    playPhaseIntro(1).then(() => {
      advanceCycle();
    });
  }

  function init() {
    loadLevelFromStorage();
    setupSpeechRecognition();
    loadImages();
    startBtn.addEventListener('click', () => {
      loadImages().then(startGame);
    });
    nextLevelBtn.addEventListener('click', () => {
      levelComplete.classList.add('hidden');
      filterPool();
      resetProgress();
      phase = 1;
      preGame.classList.remove('hidden');
      updateLevelIndicators();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
