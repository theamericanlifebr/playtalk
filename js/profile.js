document.addEventListener('DOMContentLoaded', () => {
  const authAPI = window.playtalkAuth || null;
  let currentUser = null;
  if (authAPI && typeof authAPI.getCurrentUser === 'function') {
    try {
      currentUser = authAPI.getCurrentUser();
    } catch (error) {
      console.warn('Não foi possível obter o usuário atual:', error);
      currentUser = null;
    }
  }

  const usernameField = document.getElementById('profile-username');
  const nameField = document.getElementById('profile-name');
  const photoInput = document.getElementById('profile-photo');
  const photoPreview = document.getElementById('profile-photo-preview');
  const photoPreviewImage = document.getElementById('profile-photo-image');
  const publishButton = document.getElementById('profile-photo-publish');
  const shareCheckbox = document.getElementById('profile-share-results');
  const photoProgress = document.getElementById('profile-photo-progress');
  const photoProgressCircle = document.getElementById('profile-photo-progress-circle');
  const photoProgressValue = document.getElementById('profile-photo-progress-value');
  const photoProgressText = document.getElementById('profile-photo-progress-text');
  const photoFeedback = document.getElementById('profile-photo-feedback');

  const ACCEPTED_FILE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/pjpeg']);
  const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const MAX_UPLOAD_SIZE = 3 * 1024 * 1024; // 3MB
  const TARGET_SIZE = 180;
  const OUTPUT_MIME_TYPE = 'image/jpeg';
  const OUTPUT_QUALITY = 0.85;

  const defaultAvatar = photoPreviewImage
    ? (photoPreviewImage.dataset.defaultAvatar || photoPreviewImage.src || '')
    : '';

  let progressHideTimeout = null;

  function setPhotoProgress(value) {
    if (!photoProgressCircle || !photoProgressValue) {
      return;
    }
    const normalized = Math.max(0, Math.min(100, Math.round(value)));
    photoProgressCircle.style.setProperty('--progress', normalized);
    photoProgressValue.textContent = `${normalized}%`;
  }

  function setPhotoFeedback(message, status = 'error') {
    if (!photoFeedback) {
      return;
    }
    if (!message) {
      photoFeedback.textContent = '';
      photoFeedback.removeAttribute('data-status');
      return;
    }
    photoFeedback.textContent = message;
    photoFeedback.setAttribute('data-status', status);
  }

  function showPhotoProgress() {
    if (!photoProgress) {
      return;
    }
    if (progressHideTimeout) {
      clearTimeout(progressHideTimeout);
      progressHideTimeout = null;
    }
    photoProgress.hidden = false;
    if (photoProgressText) {
      photoProgressText.textContent = 'Carregando foto...';
    }
    setPhotoProgress(0);
  }

  function hidePhotoProgress(delay = 0, options = {}) {
    if (!photoProgress) {
      return;
    }
    if (progressHideTimeout) {
      clearTimeout(progressHideTimeout);
      progressHideTimeout = null;
    }
    const hideDelay = Math.max(0, delay);
    const message = options && typeof options.message === 'string' && options.message.trim()
      ? options.message.trim()
      : 'Foto pronta!';
    progressHideTimeout = setTimeout(() => {
      if (photoProgressText) {
        photoProgressText.textContent = message;
      }
      progressHideTimeout = setTimeout(() => {
        photoProgress.hidden = true;
        if (photoProgressText) {
          photoProgressText.textContent = 'Carregando foto...';
        }
        progressHideTimeout = null;
      }, 360);
    }, hideDelay);
  }

  function triggerPhotoAnimation() {
    if (!photoPreviewImage) {
      return;
    }
    photoPreviewImage.classList.remove('profile-photo-preview__image--animate');
    void photoPreviewImage.offsetWidth;
    photoPreviewImage.classList.add('profile-photo-preview__image--animate');
  }

  function isAcceptedFileType(file) {
    if (!file) {
      return false;
    }
    if (ACCEPTED_FILE_TYPES.has(file.type)) {
      return true;
    }
    const name = file.name || '';
    const lower = name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some(ext => lower.endsWith(ext));
  }

  function createOptimizedImage(image) {
    const canvas = document.createElement('canvas');
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Contexto do canvas indisponível.');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
    const ratio = Math.max(TARGET_SIZE / image.width, TARGET_SIZE / image.height);
    const newWidth = image.width * ratio;
    const newHeight = image.height * ratio;
    const dx = (TARGET_SIZE - newWidth) / 2;
    const dy = (TARGET_SIZE - newHeight) / 2;
    ctx.drawImage(image, dx, dy, newWidth, newHeight);
    return canvas.toDataURL(OUTPUT_MIME_TYPE, OUTPUT_QUALITY);
  }

  function updatePhotoPreview(photoData, options = {}) {
    if (!photoPreview || !photoPreviewImage) {
      return;
    }
    const animate = Boolean(options.animate);
    const hasCustomPhoto = Boolean(photoData && typeof photoData === 'string' && photoData.trim());
    const nextSource = hasCustomPhoto ? photoData : (defaultAvatar || photoPreviewImage.src);

    if (nextSource && photoPreviewImage.src !== nextSource) {
      photoPreviewImage.src = nextSource;
      if (animate) {
        triggerPhotoAnimation();
      }
    } else if (animate) {
      triggerPhotoAnimation();
    }

    photoPreview.classList.toggle('has-photo', hasCustomPhoto);
  }

  const username = (currentUser && currentUser.username) || 'convidado';
  if (usernameField) {
    usernameField.value = username;
  }

  const storageKey = `profile:${username}`;
  let profileData = {};
  try {
    const stored = localStorage.getItem(storageKey);
    profileData = stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Não foi possível carregar os dados de perfil salvos.', error);
    profileData = {};
  }

  const storedAvatar = localStorage.getItem('avatar');
  if (!profileData.photo && storedAvatar) {
    profileData.photo = storedAvatar;
  }

  let pendingPhotoData = null;

  function updatePublishButtonState() {
    if (!publishButton) return;
    const hasPendingPhoto = pendingPhotoData && pendingPhotoData !== profileData.photo;
    publishButton.disabled = !hasPendingPhoto;
  }

  function persistAvatarValue(photoData) {
    if (photoData && typeof photoData === 'string' && photoData.length) {
      localStorage.setItem('avatar', photoData);
    } else {
      localStorage.removeItem('avatar');
    }
  }

  function saveProfile() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(profileData));
      persistAvatarValue(profileData.photo);
    } catch (error) {
      console.warn('Não foi possível salvar o perfil.', error);
    }
  }

  const storedDisplayName = (() => {
    const saved = localStorage.getItem('displayName');
    if (saved && saved.trim()) {
      return saved.trim();
    }
    if (profileData.name && profileData.name.trim()) {
      return profileData.name.trim();
    }
    return '';
  })();

  if (nameField && storedDisplayName) {
    nameField.value = storedDisplayName;
    profileData.name = storedDisplayName;
  }

  if (photoPreview) {
    updatePhotoPreview(profileData.photo);
  }

  persistAvatarValue(profileData.photo);
  updatePublishButtonState();

  const storedShare = localStorage.getItem('shareResults');
  const shareEnabled = storedShare !== null
    ? storedShare === 'true'
    : Boolean(profileData.shareResults);

  profileData.shareResults = shareEnabled;
  if (shareCheckbox) {
    shareCheckbox.checked = shareEnabled;
  }
  if (storedShare === null) {
    localStorage.setItem('shareResults', shareEnabled ? 'true' : 'false');
  }
  if (storedDisplayName && !localStorage.getItem('displayName')) {
    localStorage.setItem('displayName', storedDisplayName);
  }

  let persistTimeout = null;

  function triggerUserChange() {
    document.dispatchEvent(new CustomEvent('playtalk:user-change', {
      detail: { user: currentUser }
    }));
  }

  function persistProfileChanges({ emitEvent = true } = {}) {
    saveProfile();
    if (authAPI && typeof authAPI.persistProgress === 'function') {
      authAPI.persistProgress();
    }
    if (emitEvent) {
      triggerUserChange();
    }
  }

  function schedulePersist() {
    if (persistTimeout) {
      clearTimeout(persistTimeout);
    }
    triggerUserChange();
    persistTimeout = setTimeout(() => {
      persistTimeout = null;
      persistProfileChanges();
    }, 400);
  }

  if (nameField) {
    nameField.addEventListener('input', () => {
      const value = nameField.value.trim();
      profileData.name = value;
      localStorage.setItem('displayName', value);
      schedulePersist();
    });
  }

  if (shareCheckbox) {
    shareCheckbox.addEventListener('change', () => {
      const enabled = shareCheckbox.checked;
      profileData.shareResults = enabled;
      localStorage.setItem('shareResults', enabled ? 'true' : 'false');
      persistProfileChanges();
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', event => {
      const inputEl = event.target;
      const file = inputEl.files && inputEl.files[0];
      if (!file) {
        setPhotoFeedback('', 'info');
        return;
      }

      setPhotoFeedback('', 'info');

      if (!isAcceptedFileType(file)) {
        setPhotoFeedback('Formato não suportado. Use JPG, JPEG, PNG, GIF ou WEBP.', 'error');
        hidePhotoProgress(0, { message: 'Formato inválido' });
        pendingPhotoData = null;
        updatePublishButtonState();
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
        return;
      }

      if (file.size > MAX_UPLOAD_SIZE) {
        setPhotoFeedback('A foto deve ter no máximo 3MB.', 'error');
        hidePhotoProgress(0, { message: 'Arquivo muito grande' });
        pendingPhotoData = null;
        updatePublishButtonState();
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
        return;
      }

      const reader = new FileReader();

      reader.onloadstart = () => {
        showPhotoProgress();
        setPhotoProgress(0);
      };

      reader.onprogress = eventProgress => {
        if (eventProgress && eventProgress.lengthComputable) {
          const percent = (eventProgress.loaded / eventProgress.total) * 100;
          setPhotoProgress(percent);
        }
      };

      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          setPhotoFeedback('Não foi possível processar a imagem selecionada.', 'error');
          hidePhotoProgress(0, { message: 'Falha ao processar foto' });
          return;
        }

        const image = new Image();
        image.onload = () => {
          try {
            const optimized = createOptimizedImage(image);
            pendingPhotoData = optimized;
            updatePhotoPreview(pendingPhotoData, { animate: true });
            updatePublishButtonState();
            setPhotoProgress(100);
            hidePhotoProgress(120);
            setPhotoFeedback('Foto pronta para publicar!', 'success');
          } catch (error) {
            console.warn('Não foi possível otimizar a imagem selecionada.', error);
            setPhotoFeedback('Não foi possível otimizar a imagem selecionada.', 'error');
            hidePhotoProgress(0, { message: 'Falha ao processar foto' });
            pendingPhotoData = null;
            updatePublishButtonState();
          } finally {
            if (inputEl && typeof inputEl.value === 'string') {
              inputEl.value = '';
            }
          }
        };

        image.onerror = () => {
          console.warn('Não foi possível carregar a imagem selecionada.');
          setPhotoFeedback('Não foi possível carregar a imagem selecionada.', 'error');
          hidePhotoProgress(0, { message: 'Falha ao carregar foto' });
          pendingPhotoData = null;
          updatePublishButtonState();
          if (inputEl && typeof inputEl.value === 'string') {
            inputEl.value = '';
          }
        };

        image.src = result;
      };

      reader.onerror = () => {
        console.warn('Não foi possível carregar a foto selecionada.');
        setPhotoFeedback('Não foi possível carregar a foto selecionada.', 'error');
        hidePhotoProgress(0, { message: 'Falha ao carregar foto' });
        pendingPhotoData = null;
        updatePublishButtonState();
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
      };

      reader.onabort = () => {
        hidePhotoProgress(0, { message: 'Envio cancelado' });
        setPhotoFeedback('Envio cancelado.', 'error');
        pendingPhotoData = null;
        updatePublishButtonState();
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
      };

      reader.readAsDataURL(file);
    });
  }

  if (publishButton) {
    publishButton.addEventListener('click', () => {
      if (!pendingPhotoData || pendingPhotoData === profileData.photo) {
        return;
      }
      if (persistTimeout) {
        clearTimeout(persistTimeout);
        persistTimeout = null;
      }
      profileData.photo = pendingPhotoData;
      pendingPhotoData = null;
      updatePhotoPreview(profileData.photo, { animate: true });
      persistProfileChanges();
      updatePublishButtonState();
      setPhotoFeedback('Foto publicada com sucesso!', 'success');
    });
  }
});
