(() => {
  const listEl = document.getElementById('class-list');
  const libraryEl = document.getElementById('class-library');
  const playerEl = document.getElementById('class-player');
  const frameEl = document.getElementById('class-frame');
  const titleEl = document.getElementById('class-lesson-title');
  const progressEl = document.getElementById('class-progress');
  const backBtn = document.getElementById('class-back-btn');
  const importBtn = document.getElementById('import-class-btn');
  const importInput = document.getElementById('import-class-input');
  const containerEl = document.getElementById('class-container');

  const state = {
    lessons: [],
    currentLesson: null,
    currentIndex: 0,
    timerIds: [],
    activeMedia: [],
    mediaCache: new Map()
  };

  const TEXT_FALLBACK = 'Não foi possível carregar as aulas agora.';

  function shouldResolveMedia(src) {
    if (!src || typeof src !== 'string') return false;
    if (src.startsWith('http://') || src.startsWith('https://')) return false;
    if (src.startsWith('data:') || src.startsWith('blob:')) return false;
    return !src.includes('/');
  }

  async function resolveMediaSource(src) {
    if (!shouldResolveMedia(src)) return src;

    if (state.mediaCache.has(src)) {
      return state.mediaCache.get(src);
    }

    let resolved = src;

    try {
      const response = await fetch(`/api/media/resolve?name=${encodeURIComponent(src)}`, { cache: 'no-store' });
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.url) {
          resolved = payload.url;
        }
      }
    } catch (error) {
      resolved = src;
    }

    state.mediaCache.set(src, resolved);
    return resolved;
  }

  function setMediaSource(element, src) {
    if (!element || !src) return;
    if (typeof window.getGameSoundUrl === 'function' && src.includes('gamesounds/')) {
      element.src = window.getGameSoundUrl(src);
      return;
    }
    if (!shouldResolveMedia(src)) {
      element.src = src;
      return;
    }

    resolveMediaSource(src).then(resolved => {
      if (!resolved) return;
      element.src = resolved;
      if (typeof element.load === 'function') {
        element.load();
      }
    });
  }

  function clearTimers() {
    state.timerIds.forEach(timerId => clearTimeout(timerId));
    state.timerIds = [];
  }

  function scheduleTimer(callback, delay) {
    const timerId = setTimeout(callback, delay);
    state.timerIds.push(timerId);
    return timerId;
  }

  function stopActiveMedia() {
    state.activeMedia.forEach(media => {
      if (!media) return;
      media.pause();
      media.removeAttribute('src');
      media.load();
    });
    state.activeMedia = [];
  }

  function resetFrame() {
    clearTimers();
    stopActiveMedia();
    frameEl.innerHTML = '';
  }

  function showLibrary() {
    resetFrame();
    state.currentLesson = null;
    state.currentIndex = 0;
    if (containerEl) {
      containerEl.classList.remove('is-playing');
    }
    libraryEl.classList.remove('hidden');
    playerEl.classList.add('hidden');
  }

  function updateProgress() {
    if (!state.currentLesson) {
      progressEl.textContent = '';
      return;
    }
    const total = state.currentLesson.frames.length;
    progressEl.textContent = `Quadro ${state.currentIndex + 1} de ${total}`;
  }

  function nextFrame() {
    if (!state.currentLesson) return;
    state.currentIndex += 1;
    renderFrame();
  }

  function showCompletion() {
    resetFrame();
    updateProgress();
    const container = document.createElement('div');
    container.className = 'class-complete';

    const title = document.createElement('h2');
    title.textContent = 'Aula concluída!';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-primary class-complete__button';
    button.textContent = 'Voltar às aulas';
    button.addEventListener('click', showLibrary);

    container.append(title, button);
    frameEl.append(container);
  }

  function renderImage(src, audioSrc, durationMs) {
    const img = document.createElement('img');
    img.className = 'class-image';
    setMediaSource(img, src);
    img.alt = 'Imagem da aula';
    frameEl.append(img);
    if (audioSrc) {
      const audio = document.createElement('audio');
      audio.className = 'class-hidden-media';
      setMediaSource(audio, audioSrc);
      audio.autoplay = true;
      audio.addEventListener('ended', nextFrame);
      frameEl.append(audio);
      state.activeMedia.push(audio);
    }
    if (durationMs) {
      scheduleTimer(nextFrame, durationMs);
    }
  }

  function renderGrid(images) {
    const grid = document.createElement('div');
    grid.className = 'class-grid';
    images.forEach(src => {
      const img = document.createElement('img');
      setMediaSource(img, src);
      img.alt = 'Imagem da aula';
      img.className = 'class-grid__image';
      grid.append(img);
    });
    frameEl.append(grid);
  }

  function renderVisual(container, visual) {
    container.innerHTML = '';
    if (!visual) return;
    if (visual.type === 'image') {
      const img = document.createElement('img');
      img.className = 'class-image';
      setMediaSource(img, visual.src);
      img.alt = 'Imagem da aula';
      container.append(img);
      return;
    }
    if (visual.type === 'video') {
      const video = document.createElement('video');
      video.className = 'class-media class-video';
      setMediaSource(video, visual.src);
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      container.append(video);
      state.activeMedia.push(video);
      return;
    }
    if (visual.type === 'text') {
      const text = document.createElement('p');
      text.className = 'class-text';
      text.textContent = visual.text || '';
      if (visual.fontFamily) text.style.fontFamily = visual.fontFamily;
      if (visual.fontSize) text.style.fontSize = `${visual.fontSize}px`;
      if (visual.color) text.style.color = `rgb(${visual.color})`;
      container.append(text);
    }
  }

  function renderAudio(frame) {
    const wrapper = document.createElement('div');
    wrapper.className = 'class-audio';
    const visualContainer = document.createElement('div');
    visualContainer.className = 'class-audio__visual';
    wrapper.append(visualContainer);

    const visuals = Array.isArray(frame.visuals) ? frame.visuals : [];
    let visualStart = 0;
    visuals.forEach((visual, index) => {
      scheduleTimer(() => {
        renderVisual(visualContainer, visual);
      }, visualStart);
      const duration = Number(visual.durationMs) || 0;
      visualStart += duration;
      if (index === visuals.length - 1 && duration === 0) {
        renderVisual(visualContainer, visual);
      }
    });

    const audio = document.createElement('audio');
    audio.className = 'class-media';
    setMediaSource(audio, frame.src);
    audio.controls = true;
    audio.autoplay = true;
    audio.addEventListener('ended', () => {
      clearTimers();
      nextFrame();
    });
    wrapper.append(audio);
    frameEl.append(wrapper);
    state.activeMedia.push(audio);

    if (frame.durationMs) {
      scheduleTimer(nextFrame, frame.durationMs);
    }
  }

  function renderVideo(src, audioSrc, durationMs) {
    const video = document.createElement('video');
    video.className = 'class-media class-video';
    setMediaSource(video, src);
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.addEventListener('ended', nextFrame);
    frameEl.append(video);
    state.activeMedia.push(video);
    if (audioSrc) {
      const audio = document.createElement('audio');
      audio.className = 'class-hidden-media';
      setMediaSource(audio, audioSrc);
      audio.autoplay = true;
      audio.addEventListener('ended', nextFrame);
      frameEl.append(audio);
      state.activeMedia.push(audio);
      video.muted = true;
      video.loop = true;
    }
    if (durationMs) {
      scheduleTimer(nextFrame, durationMs);
    }
  }

  function renderQuiz(frame) {
    const wrapper = document.createElement('div');
    wrapper.className = 'class-quiz';

    if (frame.mode === 'text') {
      const prompt = document.createElement('p');
      prompt.className = 'class-text';
      prompt.textContent = frame.prompt || 'Pergunta';
      wrapper.append(prompt);
    } else if (frame.image) {
      const img = document.createElement('img');
      img.className = 'class-image class-quiz__image';
      setMediaSource(img, frame.image);
      img.alt = 'Imagem da pergunta';
      wrapper.append(img);
    }

    const options = document.createElement('div');
    options.className = 'class-options';

    const optionList = Array.isArray(frame.options) ? frame.options : [];
    optionList.forEach((label, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'class-option';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        if (options.classList.contains('is-answered')) return;
        options.classList.add('is-answered');
        const buttons = Array.from(options.querySelectorAll('button'));
        buttons.forEach((button, idx) => {
          button.disabled = true;
          if (idx === frame.correctIndex) {
            button.classList.add('is-correct');
          }
        });
        if (index !== frame.correctIndex) {
          btn.classList.add('is-wrong');
        }
        scheduleTimer(nextFrame, 400);
      });
      options.append(btn);
    });

    wrapper.append(options);
    frameEl.append(wrapper);
  }

  function renderText(text, fontFamily, fontSize, color, durationMs) {
    const paragraph = document.createElement('p');
    paragraph.className = 'class-text';
    paragraph.textContent = text;
    frameEl.append(paragraph);
    if (fontFamily) paragraph.style.fontFamily = fontFamily;
    if (fontSize) paragraph.style.fontSize = `${fontSize}px`;
    if (color) paragraph.style.color = `rgb(${color})`;
    if (durationMs) {
      scheduleTimer(nextFrame, durationMs);
    }
  }

  function renderFrame() {
    resetFrame();
    if (!state.currentLesson) return;

    const frames = state.currentLesson.frames;
    if (state.currentIndex >= frames.length) {
      showCompletion();
      return;
    }

    updateProgress();
    const frame = frames[state.currentIndex];

    if (!frame || !frame.type) {
      const error = document.createElement('p');
      error.className = 'class-text';
      error.textContent = 'Quadro inválido.';
      frameEl.append(error);
      return;
    }

    switch (frame.type) {
      case 'image':
        renderImage(frame.src, frame.audioSrc, frame.durationMs);
        break;
      case 'audio':
        renderAudio(frame);
        break;
      case 'imageGrid':
        renderGrid(frame.images || []);
        if (frame.durationMs) {
          scheduleTimer(nextFrame, frame.durationMs);
        }
        break;
      case 'video':
        renderVideo(frame.src, frame.audioSrc, frame.durationMs);
        break;
      case 'quiz':
        renderQuiz(frame);
        break;
      case 'text':
        renderText(frame.text, frame.fontFamily, frame.fontSize, frame.color, frame.durationMs);
        break;
      default: {
        const fallback = document.createElement('p');
        fallback.className = 'class-text';
        fallback.textContent = 'Tipo de quadro desconhecido.';
        frameEl.append(fallback);
        break;
      }
    }
  }

  function startLesson(lesson) {
    state.currentLesson = lesson;
    state.currentIndex = 0;
    titleEl.textContent = lesson.title || 'Aula';
    if (containerEl) {
      containerEl.classList.add('is-playing');
    }
    libraryEl.classList.add('hidden');
    playerEl.classList.remove('hidden');
    renderFrame();
  }

  function renderLessonList() {
    listEl.innerHTML = '';
    if (!state.lessons.length) {
      const empty = document.createElement('p');
      empty.className = 'class-text';
      empty.textContent = 'Nenhuma aula disponível.';
      listEl.append(empty);
      return;
    }

    state.lessons.forEach(lesson => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'class-card';
      card.textContent = lesson.title || 'Aula';
      card.addEventListener('click', () => startLesson(lesson));
      listEl.append(card);
    });
  }

  function normalizeLessons(data) {
    if (!data) return [];
    if (Array.isArray(data.lessons)) {
      return data.lessons.filter(lesson => Array.isArray(lesson.frames));
    }
    if (Array.isArray(data.frames)) {
      return [
        {
          title: data.title || 'Aula importada',
          frames: data.frames
        }
      ];
    }
    return [];
  }

  function addLessons(lessons) {
    if (!lessons.length) return;
    state.lessons = [...state.lessons, ...lessons];
    renderLessonList();
  }

  function handleImport(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const payload = JSON.parse(event.target.result);
        const lessons = normalizeLessons(payload);
        if (!lessons.length) {
          throw new Error('JSON inválido');
        }
        addLessons(lessons);
        startLesson(lessons[0]);
      } catch (error) {
        listEl.innerHTML = '';
        const message = document.createElement('p');
        message.className = 'class-text';
        message.textContent = 'Não foi possível importar este arquivo.';
        listEl.append(message);
      }
    };
    reader.readAsText(file);
  }

  async function loadLessons() {
    try {
      const response = await fetch('data/classes.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Erro ao carregar JSON');
      const data = await response.json();
      state.lessons = Array.isArray(data.lessons) ? data.lessons : [];
      renderLessonList();
    } catch (error) {
      listEl.innerHTML = '';
      const message = document.createElement('p');
      message.className = 'class-text';
      message.textContent = TEXT_FALLBACK;
      listEl.append(message);
    }
  }

  if (backBtn) {
    backBtn.addEventListener('click', showLibrary);
  }

  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', event => {
      const file = event.target.files[0];
      handleImport(file);
      event.target.value = '';
    });
  }

  loadLessons();
})();
