(() => {
  const listEl = document.getElementById('class-list');
  const libraryEl = document.getElementById('class-library');
  const playerEl = document.getElementById('class-player');
  const frameEl = document.getElementById('class-frame');
  const titleEl = document.getElementById('class-lesson-title');
  const progressEl = document.getElementById('class-progress');
  const backBtn = document.getElementById('class-back-btn');

  const state = {
    lessons: [],
    currentLesson: null,
    currentIndex: 0,
    timerId: null,
    activeMedia: null
  };

  const TEXT_FALLBACK = 'Não foi possível carregar as aulas agora.';

  function clearTimer() {
    if (state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
  }

  function stopActiveMedia() {
    if (state.activeMedia) {
      state.activeMedia.pause();
      state.activeMedia.removeAttribute('src');
      state.activeMedia.load();
      state.activeMedia = null;
    }
  }

  function resetFrame() {
    clearTimer();
    stopActiveMedia();
    frameEl.innerHTML = '';
  }

  function showLibrary() {
    resetFrame();
    state.currentLesson = null;
    state.currentIndex = 0;
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

  function renderImage(src) {
    const img = document.createElement('img');
    img.className = 'class-image';
    img.src = src;
    img.alt = 'Imagem da aula';
    frameEl.append(img);
  }

  function renderGrid(images) {
    const grid = document.createElement('div');
    grid.className = 'class-grid';
    images.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Imagem da aula';
      img.className = 'class-grid__image';
      grid.append(img);
    });
    frameEl.append(grid);
  }

  function renderAudio(src) {
    const audio = document.createElement('audio');
    audio.className = 'class-media';
    audio.src = src;
    audio.controls = true;
    audio.autoplay = true;
    audio.addEventListener('ended', nextFrame);
    frameEl.append(audio);
    state.activeMedia = audio;
  }

  function renderVideo(src) {
    const video = document.createElement('video');
    video.className = 'class-media class-video';
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.addEventListener('ended', nextFrame);
    frameEl.append(video);
    state.activeMedia = video;
  }

  function renderQuiz(frame) {
    const wrapper = document.createElement('div');
    wrapper.className = 'class-quiz';

    if (frame.image) {
      const img = document.createElement('img');
      img.className = 'class-image class-quiz__image';
      img.src = frame.image;
      img.alt = 'Imagem da pergunta';
      wrapper.append(img);
    }

    const options = document.createElement('div');
    options.className = 'class-options';

    frame.options.forEach((label, index) => {
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
        state.timerId = setTimeout(nextFrame, 400);
      });
      options.append(btn);
    });

    wrapper.append(options);
    frameEl.append(wrapper);
  }

  function renderText(text) {
    const paragraph = document.createElement('p');
    paragraph.className = 'class-text';
    paragraph.textContent = text;
    frameEl.append(paragraph);
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
        renderImage(frame.src);
        if (frame.durationMs) {
          state.timerId = setTimeout(nextFrame, frame.durationMs);
        }
        break;
      case 'audio':
        renderAudio(frame.src);
        break;
      case 'imageGrid':
        renderGrid(frame.images || []);
        if (frame.durationMs) {
          state.timerId = setTimeout(nextFrame, frame.durationMs);
        }
        break;
      case 'video':
        renderVideo(frame.src);
        break;
      case 'quiz':
        renderQuiz(frame);
        break;
      case 'text':
        renderText(frame.text);
        if (frame.durationMs) {
          state.timerId = setTimeout(nextFrame, frame.durationMs);
        }
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

  loadLessons();
})();
