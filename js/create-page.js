(() => {
  const frameMenu = document.getElementById('frame-menu');
  const createFrameBtn = document.getElementById('create-frame-btn');
  const closeMenuBtn = document.getElementById('close-menu-btn');
  const frameForm = document.getElementById('frame-form');
  const previewFrame = document.getElementById('frame-preview');
  const previewPlayBtn = document.getElementById('preview-play');
  const previewTime = document.getElementById('preview-time');
  const progressFill = document.getElementById('progress-fill');
  const progressSeek = document.getElementById('progress-seek');
  const visualProgress = document.getElementById('visual-progress');
  const lessonTitleInput = document.getElementById('lesson-title');
  const overviewBtn = document.getElementById('overview-btn');
  const overviewSection = document.getElementById('lesson-overview');
  const closeOverviewBtn = document.getElementById('close-overview');
  const overviewList = document.getElementById('overview-list');
  const lessonTotal = document.getElementById('lesson-total');
  const playLessonBtn = document.getElementById('play-lesson');
  const exportLessonBtn = document.getElementById('export-lesson');

  const FONT_OPTIONS = [
    'Aver',
    'Bronaco',
    'Colombia',
    'Enceladus',
    'Enceladus Regular',
    'Gealid Light',
    'Gealit',
    'Glametrix',
    'Glametrix Light',
    'Glametrix Feather',
    'Gotama',
    'Hadir Sans',
    'Kimberry',
    'Liscence Plate',
    'Metropolis',
    'Momcake',
    'Momcake Thin',
    'Munich Regular',
    'Newspappe',
    'Tittilum',
    'Titillium Web Semibold',
    'Venus Light',
    'Venus YG'
  ];

  const state = {
    title: '',
    frames: [],
    currentIndex: null,
    preview: {
      durationMs: 0,
      timeMs: 0,
      isPlaying: false,
      rafId: null,
      mediaEls: []
    },
    lessonPlay: false,
    lessonIndex: 0
  };

  const FRAME_LABELS = {
    image: 'Imagem única',
    audio: 'Áudio com visuais',
    imageGrid: 'Grade 2x2',
    video: 'Vídeo',
    quiz: 'Alternativas',
    text: 'Texto'
  };

  function formatSeconds(ms) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function fallbackDuration() {
    return 3000;
  }

  function createObjectUrl(file) {
    return file ? URL.createObjectURL(file) : '';
  }

  function loadMediaDuration(file, isVideo = false) {
    return new Promise(resolve => {
      if (!file) {
        resolve(fallbackDuration());
        return;
      }
      const url = createObjectUrl(file);
      const media = document.createElement(isVideo ? 'video' : 'audio');
      media.preload = 'metadata';
      media.src = url;
      media.addEventListener('loadedmetadata', () => {
        const durationMs = Number.isFinite(media.duration) && media.duration > 0
          ? media.duration * 1000
          : fallbackDuration();
        URL.revokeObjectURL(url);
        resolve(durationMs);
      });
      media.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(fallbackDuration());
      });
    });
  }

  function getCurrentFrame() {
    return state.currentIndex === null ? null : state.frames[state.currentIndex];
  }

  function showMenu() {
    frameMenu.classList.remove('hidden');
  }

  function hideMenu() {
    frameMenu.classList.add('hidden');
  }

  function selectFrame(index) {
    state.currentIndex = index;
    state.lessonPlay = false;
    setPreviewTime(0);
    renderFrameForm();
    renderPreview();
  }

  function addFrame(type) {
    const frame = {
      id: Date.now() + Math.random(),
      type,
      label: FRAME_LABELS[type] || 'Quadro',
      durationMs: fallbackDuration()
    };

    if (type === 'image') {
      frame.image = null;
      frame.imageName = '';
      frame.imageUrl = '';
      frame.audio = null;
      frame.audioName = '';
      frame.audioUrl = '';
      frame.audioDurationMs = 0;
      frame.durationMs = 5000;
    }

    if (type === 'audio') {
      frame.audio = null;
      frame.audioName = '';
      frame.audioUrl = '';
      frame.audioDurationMs = 0;
      frame.visuals = [];
      frame.durationMs = fallbackDuration();
    }

    if (type === 'imageGrid') {
      frame.images = Array.from({ length: 4 }, () => ({ file: null, name: '', url: '' }));
      frame.durationMs = 5000;
    }

    if (type === 'video') {
      frame.video = null;
      frame.videoName = '';
      frame.videoUrl = '';
      frame.videoDurationMs = 0;
      frame.audio = null;
      frame.audioName = '';
      frame.audioUrl = '';
      frame.audioDurationMs = 0;
    }

    if (type === 'quiz') {
      frame.mode = 'image';
      frame.image = null;
      frame.imageName = '';
      frame.imageUrl = '';
      frame.prompt = '';
      frame.options = ['', '', '', ''];
      frame.correctIndex = 0;
      frame.durationMs = 0;
    }

    if (type === 'text') {
      frame.text = '';
      frame.fontSize = 36;
      frame.fontFamily = FONT_OPTIONS[0];
      frame.color = '255,255,255';
      frame.durationMs = 5000;
    }

    state.frames.push(frame);
    selectFrame(state.frames.length - 1);
    hideMenu();
    renderOverview();
  }

  function updateLessonTitle(value) {
    state.title = value;
  }

  function updateFrameDuration(frame, durationMs) {
    frame.durationMs = Math.max(0, Number(durationMs) || 0);
    renderOverview();
    renderPreview();
  }

  function updatePreviewDuration(frame) {
    if (!frame) {
      state.preview.durationMs = 0;
      return;
    }
    if (frame.type === 'audio') {
      const visualTotal = frame.visuals.reduce((total, visual) => total + (visual.durationMs || 0), 0);
      const audioDuration = frame.audioDurationMs || fallbackDuration();
      state.preview.durationMs = Math.max(audioDuration, visualTotal, fallbackDuration());
      return;
    }
    if (frame.type === 'image') {
      state.preview.durationMs = frame.audioDurationMs || frame.durationMs || fallbackDuration();
      return;
    }
    if (frame.type === 'video') {
      const base = frame.videoDurationMs || fallbackDuration();
      const audio = frame.audioDurationMs || 0;
      state.preview.durationMs = Math.max(base, audio, fallbackDuration());
      return;
    }
    if (frame.type === 'quiz') {
      state.preview.durationMs = 0;
      return;
    }
    state.preview.durationMs = frame.durationMs || fallbackDuration();
  }

  function setPreviewTime(timeMs) {
    state.preview.timeMs = Math.max(0, Math.min(timeMs, state.preview.durationMs || 0));
    const percent = state.preview.durationMs ? (state.preview.timeMs / state.preview.durationMs) * 100 : 0;
    progressFill.style.width = `${percent}%`;
    progressSeek.value = `${percent}`;
    previewTime.textContent = formatSeconds(state.preview.timeMs || 0);
  }

  function stopPreview() {
    state.preview.isPlaying = false;
    previewPlayBtn.textContent = '▶️ Reproduzir';
    if (state.preview.rafId) {
      cancelAnimationFrame(state.preview.rafId);
      state.preview.rafId = null;
    }
    state.preview.mediaEls.forEach(media => media.pause());
  }

  function startPreview() {
    if (!state.preview.durationMs) return;
    state.preview.isPlaying = true;
    previewPlayBtn.textContent = '⏸️ Pausar';
    const start = performance.now() - state.preview.timeMs;

    const tick = now => {
      if (!state.preview.isPlaying) return;
      const nextTime = now - start;
      if (nextTime >= state.preview.durationMs) {
        setPreviewTime(state.preview.durationMs);
        stopPreview();
        if (state.lessonPlay) {
          playNextLessonFrame();
        }
        return;
      }
      setPreviewTime(nextTime);
      syncMediaToTime();
      updateVisualOverlay();
      state.preview.rafId = requestAnimationFrame(tick);
    };

    state.preview.mediaEls.forEach(media => {
      media.currentTime = state.preview.timeMs / 1000;
      media.play().catch(() => undefined);
    });
    state.preview.rafId = requestAnimationFrame(tick);
  }

  function togglePreview() {
    if (state.preview.isPlaying) {
      stopPreview();
    } else {
      startPreview();
    }
  }

  function syncMediaToTime() {
    const desired = state.preview.timeMs / 1000;
    state.preview.mediaEls.forEach(media => {
      if (Math.abs(media.currentTime - desired) > 0.3) {
        media.currentTime = desired;
      }
    });
  }

  function updateVisualOverlay() {
    const frame = getCurrentFrame();
    if (!frame || frame.type !== 'audio') return;
    const container = previewFrame.querySelector('[data-visual-container]');
    if (!container) return;
    container.innerHTML = '';
    if (!frame.visuals.length) {
      if (!frame.audioUrl) {
        container.textContent = 'Imagem não encontrada';
      }
      return;
    }
    let cursor = 0;
    let visualStart = 0;
    let activeVisual = null;
    frame.visuals.some(item => {
      const duration = item.durationMs || 0;
      if (state.preview.timeMs >= cursor && state.preview.timeMs < cursor + duration) {
        activeVisual = item;
        visualStart = cursor;
        return true;
      }
      cursor += duration;
      return false;
    });
    const visual = activeVisual;
    if (!visual) return;
    if (visual.type === 'image') {
      const img = document.createElement('img');
      img.className = 'class-image';
      img.src = visual.url || '';
      img.alt = 'Imagem do quadro';
      img.addEventListener('error', () => {
        container.textContent = 'Imagem não encontrada';
      });
      container.append(img);
    }
    if (visual.type === 'text') {
      const text = document.createElement('p');
      text.className = 'class-text';
      text.textContent = visual.text || 'Texto';
      text.style.fontFamily = visual.fontFamily || 'Open Sans';
      text.style.fontSize = `${visual.fontSize || 32}px`;
      text.style.color = `rgb(${visual.color || '255,255,255'})`;
      container.append(text);
    }
    if (visual.type === 'video') {
      const video = document.createElement('video');
      video.className = 'class-media class-video';
      video.src = visual.url || '';
      video.muted = true;
      video.playsInline = true;
      video.currentTime = (state.preview.timeMs - visualStart) / 1000;
      container.append(video);
    }
  }

  function buildField(label, inputEl) {
    const wrapper = document.createElement('label');
    wrapper.className = 'create-field';
    const span = document.createElement('span');
    span.textContent = label;
    wrapper.append(span, inputEl);
    return wrapper;
  }

  function buildFileInput(accept, onChange) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', event => onChange(event.target.files[0]));
    return input;
  }

  function buildTextInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.addEventListener('input', event => onChange(event.target.value));
    return input;
  }

  function buildNumberInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.value = value || 0;
    input.addEventListener('input', event => onChange(event.target.value));
    return input;
  }

  function buildSelect(options, value, onChange) {
    const select = document.createElement('select');
    options.forEach(option => {
      const item = document.createElement('option');
      item.value = option;
      item.textContent = option;
      if (option === value) item.selected = true;
      select.append(item);
    });
    select.addEventListener('change', event => onChange(event.target.value));
    return select;
  }

  function buildTextarea(value, onChange) {
    const textarea = document.createElement('textarea');
    textarea.rows = 4;
    textarea.value = value || '';
    textarea.addEventListener('input', event => onChange(event.target.value));
    return textarea;
  }

  function renderFrameForm() {
    frameForm.innerHTML = '';
    const frame = getCurrentFrame();
    if (!frame) {
      frameForm.innerHTML = '<p class="class-text">Escolha um tipo de quadro para começar.</p>';
      return;
    }

    const title = document.createElement('h3');
    title.className = 'create-frame-title';
    title.textContent = `${frame.label}`;
    frameForm.append(title);

    if (frame.type === 'image') {
      const imageInput = buildFileInput('image/*', file => {
        frame.image = file;
        frame.imageName = file ? file.name : '';
        frame.imageUrl = file ? createObjectUrl(file) : '';
        renderPreview();
      });
      frameForm.append(buildField('Imagem', imageInput));

      const durationInput = buildNumberInput(frame.durationMs / 1000, value => {
        updateFrameDuration(frame, Number(value) * 1000);
      });
      frameForm.append(buildField('Tempo (segundos)', durationInput));

      const audioInput = buildFileInput('audio/*', async file => {
        frame.audio = file;
        frame.audioName = file ? file.name : '';
        frame.audioUrl = file ? createObjectUrl(file) : '';
        frame.audioDurationMs = await loadMediaDuration(file, false);
        updatePreviewDuration(frame);
        renderPreview();
        renderOverview();
      });
      frameForm.append(buildField('Áudio opcional', audioInput));
    }

    if (frame.type === 'audio') {
      const audioInput = buildFileInput('audio/*', async file => {
        frame.audio = file;
        frame.audioName = file ? file.name : '';
        frame.audioUrl = file ? createObjectUrl(file) : '';
        frame.audioDurationMs = await loadMediaDuration(file, false);
        updatePreviewDuration(frame);
        renderPreview();
        renderOverview();
      });
      frameForm.append(buildField('Áudio', audioInput));

      const addVisual = document.createElement('button');
      addVisual.type = 'button';
      addVisual.className = 'btn-secondary';
      addVisual.textContent = 'Adicionar visual (imagem, texto ou vídeo)';
      addVisual.addEventListener('click', () => {
        frame.visuals.push({
          id: Date.now() + Math.random(),
          type: 'image',
          file: null,
          name: '',
          url: '',
          text: '',
          fontFamily: FONT_OPTIONS[0],
          fontSize: 32,
          color: '255,255,255',
          durationMs: 3000
        });
        renderFrameForm();
        renderPreview();
      });
      frameForm.append(addVisual);

      frame.visuals.forEach((visual, index) => {
        const visualCard = document.createElement('div');
        visualCard.className = 'create-visual';

        const typeSelect = buildSelect(['image', 'text', 'video'], visual.type, value => {
          visual.type = value;
          renderFrameForm();
          renderPreview();
        });
        visualCard.append(buildField(`Visual ${index + 1} - tipo`, typeSelect));

        if (visual.type === 'image' || visual.type === 'video') {
          const fileInput = buildFileInput(visual.type === 'image' ? 'image/*' : 'video/*', file => {
            visual.file = file;
            visual.name = file ? file.name : '';
            visual.url = file ? createObjectUrl(file) : '';
            renderPreview();
          });
          visualCard.append(buildField('Arquivo', fileInput));
        }

        if (visual.type === 'text') {
          visualCard.append(buildField('Texto', buildTextarea(visual.text, value => {
            visual.text = value;
            renderPreview();
          })));
          visualCard.append(buildField('Fonte', buildSelect(FONT_OPTIONS, visual.fontFamily, value => {
            visual.fontFamily = value;
            renderPreview();
          })));
          visualCard.append(buildField('Tamanho', buildNumberInput(visual.fontSize, value => {
            visual.fontSize = Number(value) || 32;
            renderPreview();
          })));
          visualCard.append(buildField('Cor (RGB)', buildTextInput(visual.color, value => {
            visual.color = value;
            renderPreview();
          })));
        }

        visualCard.append(buildField('Tempo (segundos)', buildNumberInput(visual.durationMs / 1000, value => {
          visual.durationMs = Number(value) * 1000;
          updatePreviewDuration(frame);
          renderPreview();
          renderOverview();
        })));

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-secondary';
        removeBtn.textContent = 'Remover visual';
        removeBtn.addEventListener('click', () => {
          frame.visuals.splice(index, 1);
          updatePreviewDuration(frame);
          renderFrameForm();
          renderPreview();
          renderOverview();
        });
        visualCard.append(removeBtn);
        frameForm.append(visualCard);
      });
    }

    if (frame.type === 'imageGrid') {
      frame.images.forEach((image, index) => {
        const fileInput = buildFileInput('image/*', file => {
          image.file = file;
          image.name = file ? file.name : '';
          image.url = file ? createObjectUrl(file) : '';
          renderPreview();
        });
        frameForm.append(buildField(`Imagem ${index + 1}`, fileInput));
      });
      frameForm.append(buildField('Tempo (segundos)', buildNumberInput(frame.durationMs / 1000, value => {
        updateFrameDuration(frame, Number(value) * 1000);
      })));
    }

    if (frame.type === 'video') {
      const videoInput = buildFileInput('video/*', async file => {
        frame.video = file;
        frame.videoName = file ? file.name : '';
        frame.videoUrl = file ? createObjectUrl(file) : '';
        frame.videoDurationMs = await loadMediaDuration(file, true);
        updatePreviewDuration(frame);
        renderPreview();
        renderOverview();
      });
      frameForm.append(buildField('Vídeo', videoInput));

      const audioInput = buildFileInput('audio/*', async file => {
        frame.audio = file;
        frame.audioName = file ? file.name : '';
        frame.audioUrl = file ? createObjectUrl(file) : '';
        frame.audioDurationMs = await loadMediaDuration(file, false);
        updatePreviewDuration(frame);
        renderPreview();
        renderOverview();
      });
      frameForm.append(buildField('Áudio opcional (vídeo mudo)', audioInput));
    }

    if (frame.type === 'quiz') {
      const modeSelect = buildSelect(['image', 'text'], frame.mode, value => {
        frame.mode = value;
        renderFrameForm();
        renderPreview();
      });
      frameForm.append(buildField('Tipo do enunciado', modeSelect));

      if (frame.mode === 'image') {
        const imageInput = buildFileInput('image/*', file => {
          frame.image = file;
          frame.imageName = file ? file.name : '';
          frame.imageUrl = file ? createObjectUrl(file) : '';
          renderPreview();
        });
        frameForm.append(buildField('Imagem', imageInput));
      } else {
        frameForm.append(buildField('Texto', buildTextarea(frame.prompt, value => {
          frame.prompt = value;
          renderPreview();
        })));
      }

      frame.options.forEach((option, index) => {
        const optionInput = buildTextInput(option, value => {
          frame.options[index] = value;
          renderPreview();
        });
        frameForm.append(buildField(`Alternativa ${index + 1}`, optionInput));
      });

      frameForm.append(buildField('Índice da correta (1-4)', buildNumberInput(frame.correctIndex + 1, value => {
        const idx = Math.min(3, Math.max(0, Number(value) - 1));
        frame.correctIndex = idx;
        renderPreview();
      })));
    }

    if (frame.type === 'text') {
      frameForm.append(buildField('Texto', buildTextarea(frame.text, value => {
        frame.text = value;
        renderPreview();
      })));
      frameForm.append(buildField('Fonte', buildSelect(FONT_OPTIONS, frame.fontFamily, value => {
        frame.fontFamily = value;
        renderPreview();
      })));
      frameForm.append(buildField('Tamanho', buildNumberInput(frame.fontSize, value => {
        frame.fontSize = Number(value) || 32;
        renderPreview();
      })));
      frameForm.append(buildField('Cor (RGB)', buildTextInput(frame.color, value => {
        frame.color = value;
        renderPreview();
      })));
      frameForm.append(buildField('Tempo (segundos)', buildNumberInput(frame.durationMs / 1000, value => {
        updateFrameDuration(frame, Number(value) * 1000);
      })));
    }
  }

  function clearPreviewMedia() {
    state.preview.mediaEls.forEach(media => media.pause());
    state.preview.mediaEls = [];
  }

  function renderPreview() {
    stopPreview();
    clearPreviewMedia();
    previewFrame.innerHTML = '';
    const frame = getCurrentFrame();
    updatePreviewDuration(frame);
    setPreviewTime(0);

    if (!frame) {
      previewFrame.innerHTML = '<p class="class-text">Nenhum quadro selecionado.</p>';
      return;
    }

    if (frame.type === 'image') {
      if (frame.imageUrl) {
        const img = document.createElement('img');
        img.className = 'class-image';
        img.src = frame.imageUrl;
        img.alt = 'Imagem do quadro';
        img.addEventListener('error', () => {
          previewFrame.textContent = 'Imagem não encontrada';
        });
        previewFrame.append(img);
      } else {
        previewFrame.textContent = 'Imagem não encontrada';
      }
      if (frame.audioUrl) {
        const audio = document.createElement('audio');
        audio.src = frame.audioUrl;
        audio.preload = 'metadata';
        audio.className = 'create-hidden-media';
        previewFrame.append(audio);
        state.preview.mediaEls.push(audio);
      }
    }

    if (frame.type === 'audio') {
      previewFrame.classList.add('create-frame--audio');
      const visualContainer = document.createElement('div');
      visualContainer.dataset.visualContainer = 'true';
      previewFrame.append(visualContainer);
      if (frame.audioUrl) {
        const audio = document.createElement('audio');
        audio.src = frame.audioUrl;
        audio.preload = 'metadata';
        audio.className = 'create-hidden-media';
        previewFrame.append(audio);
        state.preview.mediaEls.push(audio);
      }
      updateVisualOverlay();
    } else {
      previewFrame.classList.remove('create-frame--audio');
    }

    if (frame.type === 'imageGrid') {
      const grid = document.createElement('div');
      grid.className = 'class-grid';
      frame.images.forEach(image => {
        const img = document.createElement('img');
        img.className = 'class-grid__image';
        img.src = image.url || '';
        img.alt = 'Imagem do quadro';
        img.addEventListener('error', () => {
          img.replaceWith(document.createTextNode('Imagem não encontrada'));
        });
        grid.append(img);
      });
      previewFrame.append(grid);
    }

    if (frame.type === 'video') {
      if (frame.videoUrl) {
        const video = document.createElement('video');
        video.className = 'class-media class-video';
        video.src = frame.videoUrl;
        video.muted = true;
        video.playsInline = true;
        video.addEventListener('error', () => {
          previewFrame.textContent = 'Imagem não encontrada';
        });
        previewFrame.append(video);
        state.preview.mediaEls.push(video);
      } else {
        previewFrame.textContent = 'Imagem não encontrada';
      }
      if (frame.audioUrl) {
        const audio = document.createElement('audio');
        audio.src = frame.audioUrl;
        audio.preload = 'metadata';
        audio.className = 'create-hidden-media';
        previewFrame.append(audio);
        state.preview.mediaEls.push(audio);
      }
    }

    if (frame.type === 'quiz') {
      const wrapper = document.createElement('div');
      wrapper.className = 'class-quiz';

      if (frame.mode === 'image') {
        if (frame.imageUrl) {
          const img = document.createElement('img');
          img.className = 'class-image class-quiz__image';
          img.src = frame.imageUrl;
          img.alt = 'Imagem da pergunta';
          img.addEventListener('error', () => {
            wrapper.textContent = 'Imagem não encontrada';
          });
          wrapper.append(img);
        } else {
          wrapper.textContent = 'Imagem não encontrada';
        }
      } else {
        const prompt = document.createElement('p');
        prompt.className = 'class-text';
        prompt.textContent = frame.prompt || 'Texto da pergunta';
        wrapper.append(prompt);
      }

      const options = document.createElement('div');
      options.className = 'class-options';
      frame.options.forEach(option => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'class-option';
        btn.textContent = option || 'Alternativa';
        options.append(btn);
      });
      wrapper.append(options);
      previewFrame.append(wrapper);
    }

    if (frame.type === 'text') {
      const text = document.createElement('p');
      text.className = 'class-text';
      text.textContent = frame.text || 'Texto do quadro';
      text.style.fontFamily = frame.fontFamily;
      text.style.fontSize = `${frame.fontSize}px`;
      text.style.color = `rgb(${frame.color})`;
      previewFrame.append(text);
    }

    renderVisualProgress();
  }

  function renderVisualProgress() {
    const frame = getCurrentFrame();
    if (!frame || frame.type !== 'audio') {
      visualProgress.style.width = '0%';
      return;
    }
    const visualTotal = frame.visuals.reduce((total, visual) => total + (visual.durationMs || 0), 0);
    const duration = state.preview.durationMs || fallbackDuration();
    const percent = duration ? (visualTotal / duration) * 100 : 0;
    visualProgress.style.width = `${Math.min(100, percent)}%`;
  }

  function renderOverview() {
    overviewList.innerHTML = '';
    let totalDuration = 0;
    state.frames.forEach((frame, index) => {
      const card = document.createElement('div');
      card.className = 'create-overview__card';

      const info = document.createElement('div');
      info.className = 'create-overview__info';
      const title = document.createElement('strong');
      title.textContent = `Quadro ${index + 1} - ${frame.label}`;
      const duration = document.createElement('span');
      const durationValue = getFrameDuration(frame);
      duration.textContent = `Tempo: ${formatSeconds(durationValue)}`;
      info.append(title, duration);

      const actions = document.createElement('div');
      actions.className = 'create-overview__actions';

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'create-overview__icon';
      playBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="8,5 19,12 8,19"></polygon></svg>';
      playBtn.addEventListener('click', () => {
        selectFrame(index);
        showEditor();
        startPreview();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'create-overview__icon';
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z"></path></svg>';
      deleteBtn.addEventListener('click', () => {
        const confirmed = window.confirm('Deseja apagar este quadro?');
        if (!confirmed) return;
        state.frames.splice(index, 1);
        if (state.currentIndex === index) {
          state.currentIndex = null;
        }
        renderOverview();
        renderFrameForm();
        renderPreview();
      });

      card.addEventListener('click', () => {
        selectFrame(index);
        showEditor();
      });

      actions.append(playBtn, deleteBtn);
      card.append(info, actions);
      overviewList.append(card);
      totalDuration += durationValue;
    });

    lessonTotal.textContent = `Tempo total: ${formatSeconds(totalDuration)}`;
  }

  function getFrameDuration(frame) {
    if (frame.type === 'audio') {
      const visuals = frame.visuals.reduce((total, visual) => total + (visual.durationMs || 0), 0);
      const audio = frame.audioDurationMs || fallbackDuration();
      return Math.max(visuals, audio, fallbackDuration());
    }
    if (frame.type === 'image') {
      return frame.audioDurationMs || frame.durationMs || fallbackDuration();
    }
    if (frame.type === 'video') {
      return Math.max(frame.videoDurationMs || 0, frame.audioDurationMs || 0, fallbackDuration());
    }
    if (frame.type === 'quiz') {
      return 0;
    }
    return frame.durationMs || fallbackDuration();
  }

  function showOverview() {
    overviewSection.classList.remove('hidden');
    renderOverview();
  }

  function showEditor() {
    overviewSection.classList.add('hidden');
  }

  function playLesson() {
    if (!state.frames.length) return;
    state.lessonPlay = true;
    state.lessonIndex = 0;
    selectFrame(0);
    startPreview();
  }

  function playNextLessonFrame() {
    if (!state.lessonPlay) return;
    state.lessonIndex += 1;
    if (state.lessonIndex >= state.frames.length) {
      state.lessonPlay = false;
      stopPreview();
      return;
    }
    selectFrame(state.lessonIndex);
    startPreview();
  }

  function buildExport() {
    return {
      title: state.title || 'Aula',
      frames: state.frames.map(frame => {
        if (frame.type === 'image') {
          return {
            type: 'image',
            src: frame.imageName,
            audioSrc: frame.audioName,
            durationMs: frame.audioDurationMs || frame.durationMs
          };
        }
        if (frame.type === 'audio') {
          return {
            type: 'audio',
            src: frame.audioName,
            durationMs: getFrameDuration(frame),
            visuals: frame.visuals.map(visual => ({
              type: visual.type,
              src: visual.name,
              text: visual.text,
              fontFamily: visual.fontFamily,
              fontSize: visual.fontSize,
              color: visual.color,
              durationMs: visual.durationMs
            }))
          };
        }
        if (frame.type === 'imageGrid') {
          return {
            type: 'imageGrid',
            images: frame.images.map(image => image.name),
            durationMs: frame.durationMs
          };
        }
        if (frame.type === 'video') {
          return {
            type: 'video',
            src: frame.videoName,
            audioSrc: frame.audioName,
            durationMs: getFrameDuration(frame)
          };
        }
        if (frame.type === 'quiz') {
          return {
            type: 'quiz',
            mode: frame.mode,
            image: frame.imageName,
            prompt: frame.prompt,
            options: frame.options,
            correctIndex: frame.correctIndex
          };
        }
        if (frame.type === 'text') {
          return {
            type: 'text',
            text: frame.text,
            fontFamily: frame.fontFamily,
            fontSize: frame.fontSize,
            color: frame.color,
            durationMs: frame.durationMs
          };
        }
        return frame;
      })
    };
  }

  function exportLesson() {
    const payload = buildExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(state.title || 'aula').replace(/\s+/g, '_').toLowerCase()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (createFrameBtn) {
    createFrameBtn.addEventListener('click', showMenu);
  }

  if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', hideMenu);
  }

  if (frameMenu) {
    frameMenu.addEventListener('click', event => {
      const card = event.target.closest('[data-frame-type]');
      if (!card) return;
      addFrame(card.dataset.frameType);
    });
  }

  if (previewPlayBtn) {
    previewPlayBtn.addEventListener('click', togglePreview);
  }

  if (progressSeek) {
    progressSeek.addEventListener('input', event => {
      const percent = Number(event.target.value) || 0;
      const time = (percent / 100) * (state.preview.durationMs || 0);
      setPreviewTime(time);
      syncMediaToTime();
      updateVisualOverlay();
    });
  }

  if (lessonTitleInput) {
    lessonTitleInput.addEventListener('input', event => updateLessonTitle(event.target.value));
  }

  if (overviewBtn) {
    overviewBtn.addEventListener('click', showOverview);
  }

  if (closeOverviewBtn) {
    closeOverviewBtn.addEventListener('click', showEditor);
  }

  if (playLessonBtn) {
    playLessonBtn.addEventListener('click', () => {
      showEditor();
      playLesson();
    });
  }

  if (exportLessonBtn) {
    exportLessonBtn.addEventListener('click', exportLesson);
  }

  renderFrameForm();
})();
