(() => {
  const state = {
    items: [],
    index: 0,
    recognizer: null,
    listening: false,
    advanceLock: false
  };

  const elements = {
    instruction: document.getElementById('image-game-instruction'),
    target: document.getElementById('image-game-target'),
    status: document.getElementById('image-game-status'),
    transcript: document.getElementById('image-game-transcript'),
    english: document.getElementById('image-game-english'),
    micButton: document.getElementById('image-game-mic'),
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

  const updateImage = () => {
    const current = state.items[state.index];
    if (!current || !elements.target) return;
    elements.target.src = `images/${current.file}`;
    elements.target.alt = current.pt ? `Imagem ${current.pt}` : 'Imagem do jogo';
    elements.target.classList.remove('image-game-target--slide');
    requestAnimationFrame(() => {
      elements.target.classList.add('image-game-target--slide');
    });
    if (elements.english) {
      elements.english.textContent = current.en || '';
    }
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

  const advanceImage = () => {
    if (state.advanceLock) return;
    state.advanceLock = true;
    state.index = (state.index + 1) % state.items.length;
    updateImage();
    showTranscript('');
    showStatus('');
    setTimeout(() => {
      state.advanceLock = false;
    }, 500);
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

  const setupRecognizer = () => {
    if (state.recognizer || typeof window.KitSpeechRecognizer !== 'function') return;
    state.recognizer = new window.KitSpeechRecognizer({ lang: 'en-US' });
    state.recognizer.onresult = handleSpeechResult;
    state.recognizer.onerror = (event) => {
      const message = event && event.error === 'not-supported'
        ? 'Reconhecimento de voz não suportado neste navegador.'
        : 'Não foi possível iniciar o microfone.';
      showStatus(message, 'warning');
      state.listening = false;
      updateMicButton();
    };
    state.recognizer.onend = () => {
      state.listening = false;
      updateMicButton();
    };
  };

  const updateMicButton = () => {
    if (!elements.micButton) return;
    elements.micButton.classList.toggle('is-active', state.listening);
    elements.micButton.setAttribute('aria-pressed', state.listening ? 'true' : 'false');
    elements.micButton.setAttribute(
      'aria-label',
      state.listening ? 'Desativar microfone' : 'Ativar microfone'
    );
  };

  const startListening = () => {
    if (!state.recognizer) {
      showStatus('Reconhecimento de voz não disponível.', 'warning');
      return;
    }
    if (state.listening) return;
    state.listening = true;
    updateMicButton();
    state.recognizer.start();
  };

  const stopListening = () => {
    if (!state.recognizer || !state.listening) return;
    state.listening = false;
    updateMicButton();
    state.recognizer.stop();
  };

  const toggleListening = () => {
    if (state.listening) {
      stopListening();
      return;
    }
    startListening();
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

      if (isSwipeLeft) {
        advanceImage();
        return;
      }

      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && elapsed < 500) {
        speakCurrentWord();
      }
    });
  };

  const bindEvents = () => {
    if (elements.micButton) {
      elements.micButton.addEventListener('click', () => toggleListening());
    }
    if (elements.audioButton) {
      elements.audioButton.addEventListener('click', () => speakCurrentWord());
    }
    if (elements.translateButton) {
      elements.translateButton.addEventListener('click', () => {
        if (!elements.english) return;
        const shouldShow = elements.english.hasAttribute('hidden');
        elements.english.toggleAttribute('hidden', !shouldShow);
        elements.translateButton.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
      });
    }
    if (elements.target) {
      elements.target.addEventListener('animationend', () => {
        elements.target.classList.remove('image-game-target--slide');
      });
    }
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        advanceImage();
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
      updateImage();
      showStatus('');
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      showStatus('Erro ao carregar as imagens.', 'warning');
    }
  };

  const init = () => {
    setupRecognizer();
    bindEvents();
    loadItems();
    updateMicButton();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
