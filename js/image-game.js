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
    counter: document.getElementById('image-game-counter'),
    startButton: document.getElementById('image-game-start')
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

  const updateCounter = () => {
    if (!elements.counter) return;
    elements.counter.textContent = `Imagem ${state.index + 1} de ${state.items.length}`;
  };

  const updateImage = () => {
    const current = state.items[state.index];
    if (!current || !elements.target) return;
    elements.target.src = `images/${current.file}`;
    elements.target.alt = current.pt ? `Imagem ${current.pt}` : 'Imagem do jogo';
    updateCounter();
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
    showStatus('Pronto! Próxima imagem.', 'success');
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
      showStatus('Resposta correta!', 'success');
      advanceImage();
      return;
    }

    showStatus('Tente novamente.', 'warning');
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
      if (elements.startButton) {
        elements.startButton.disabled = false;
        elements.startButton.textContent = 'Iniciar microfone';
      }
    };
    state.recognizer.onend = () => {
      state.listening = false;
      if (elements.startButton) {
        elements.startButton.disabled = false;
        elements.startButton.textContent = 'Iniciar microfone';
      }
    };
  };

  const startListening = () => {
    if (!state.recognizer) {
      showStatus('Reconhecimento de voz não disponível.', 'warning');
      return;
    }
    if (state.listening) return;
    state.listening = true;
    if (elements.startButton) {
      elements.startButton.disabled = true;
      elements.startButton.textContent = 'Microfone ativo';
    }
    showStatus('Microfone ativo. Fale a palavra.', 'info');
    state.recognizer.start();
  };

  const bindEvents = () => {
    if (elements.startButton) {
      elements.startButton.addEventListener('click', () => startListening());
    }
  };

  const loadItems = async () => {
    try {
      const response = await fetch('images/images.json', { cache: 'no-store' });
      const data = await response.json();
      state.items = (Array.isArray(data) ? data : [])
        .map(parseItem)
        .filter((entry) => entry && entry.file);

      if (!state.items.length) {
        showStatus('Nenhuma imagem encontrada.', 'warning');
        return;
      }

      state.index = 0;
      updateImage();
      showStatus('Toque no botão para ativar o microfone.', 'info');
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      showStatus('Erro ao carregar as imagens.', 'warning');
    }
  };

  const init = () => {
    setupRecognizer();
    bindEvents();
    loadItems();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
