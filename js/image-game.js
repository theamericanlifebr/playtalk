(() => {
  const state = {
    items: [],
    index: 0,
    recognizer: null,
    listening: false,
    advanceLock: false,
    lensOverrides: null,
    preloaded: new Set(),
    transitionAudio: null
  };

  const elements = {
    instruction: document.getElementById('image-game-instruction'),
    target: document.getElementById('image-game-target'),
    status: document.getElementById('image-game-status'),
    transcript: document.getElementById('image-game-transcript'),
    english: document.getElementById('image-game-english'),
    gameMain: document.getElementById('game-main'),
    audioButton: document.getElementById('image-game-audio'),
    translateButton: document.getElementById('image-game-translate')
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
      return { pt: pt || '', en: en || '', file: file || '' };
    }
    if (typeof entry === 'object') {
      return {
        pt: entry.pt || entry.portuguese || '',
        en: entry.en || entry.english || '',
        file: entry.file || entry.image || ''
      };
    }
    return null;
  };

  const hiddenClass = 'image-game-target--hidden';

  const clearSlideClasses = () => {
    if (!elements.target) return;
    elements.target.classList.remove('image-game-target--slide-in', 'image-game-target--slide-out');
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

  const showTranscript = (message) => {
    if (!elements.transcript) return;
    elements.transcript.textContent = message;
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

  const advanceImage = () => {
    if (state.advanceLock) return;
    if (!state.items.length) return;
    state.advanceLock = true;
    const nextIndex = (state.index + 1) % state.items.length;
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

    if (said && said.includes(expected)) {
      showStatus('');
      advanceImage();
    }
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
    });

    elements.target.addEventListener('pointerup', (event) => {
      if (gesture.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
      const elapsed = Date.now() - gesture.startTime;
      const isSwipeLeft = deltaX < -swipeThreshold && Math.abs(deltaY) < 80;
      const isSwipeDown = deltaY > swipeThreshold && Math.abs(deltaX) < 80;

      if (isSwipeLeft) {
        advanceImage();
        return;
      }

      if (isSwipeDown) {
        showPhrase('en');
        return;
      }

      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && elapsed < 500) {
        speakCurrentWord();
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
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        advanceImage();
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
      state.items = (Array.isArray(data) ? data : [])
        .map(parseItem)
        .filter((entry) => entry && entry.file);

      for (let i = state.items.length - 1; i > 0; i -= 1) {
        const swapIndex = Math.floor(Math.random() * (i + 1));
        [state.items[i], state.items[swapIndex]] = [state.items[swapIndex], state.items[i]];
      }

      if (!state.items.length) {
        showStatus('Nenhuma imagem encontrada.', 'warning');
        return;
      }

      state.index = 0;
      updateImage({ animateIn: true });
      showStatus('');
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      showStatus('Erro ao carregar as imagens.', 'warning');
    }
  };

  const init = () => {
    bindEvents();
    loadItems();
    document.body?.addEventListener(
      'touchmove',
      (event) => {
        event.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener('scroll', () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
