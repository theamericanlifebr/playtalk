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
  const publishButton = document.getElementById('profile-photo-publish');
  const shareCheckbox = document.getElementById('profile-share-results');
  const photoProgress = document.getElementById('profile-photo-progress');
  const photoProgressCircle = document.getElementById('profile-photo-progress-circle');
  const photoProgressValue = document.getElementById('profile-photo-progress-value');
  const photoProgressText = document.getElementById('profile-photo-progress-text');

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const MAX_PHOTO_SIZE = 3 * 1024 * 1024;

  const previewDefaultText = photoPreview ? photoPreview.textContent : '';

  if (photoPreview) {
    photoPreview.classList.remove('profile-photo-preview--icon');
  }

  let progressHideTimeout = null;

  function setPhotoProgress(value) {
    if (!photoProgressCircle || !photoProgressValue) {
      return;
    }
    const normalized = Math.max(0, Math.min(100, Math.round(value)));
    photoProgressCircle.style.setProperty('--progress', normalized);
    photoProgressValue.textContent = `${normalized}%`;
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

  function updatePhotoPreview(photoData, options = {}) {
    if (!photoPreview) {
      return;
    }
    const animate = Boolean(options.animate);
    if (photoData && typeof photoData === 'string' && photoData.trim()) {
      photoPreview.style.backgroundImage = `url(${photoData})`;
      photoPreview.style.background = '';
      photoPreview.classList.add('has-photo');
      photoPreview.classList.remove('profile-photo-preview--icon');
      photoPreview.textContent = '';
      if (animate) {
        photoPreview.classList.remove('profile-photo-preview--fading');
        void photoPreview.offsetWidth;
        photoPreview.classList.add('profile-photo-preview--fading');
        photoPreview.addEventListener('animationend', () => {
          photoPreview.classList.remove('profile-photo-preview--fading');
        }, { once: true });
      }
    } else {
      photoPreview.style.backgroundImage = '';
      photoPreview.classList.remove('has-photo');
      photoPreview.classList.remove('profile-photo-preview--icon');
      photoPreview.classList.remove('profile-photo-preview--fading');
      photoPreview.style.background = '';
      photoPreview.textContent = previewDefaultText || 'Adicione uma foto';
    }
  }

  function notifyPhotoIssue(message) {
    const info = typeof message === 'string' && message.trim()
      ? message.trim()
      : 'Não foi possível usar esta imagem.';
    if (photoProgress) {
      showPhotoProgress();
      if (photoProgressText) {
        photoProgressText.textContent = info;
      }
      hidePhotoProgress(1600, { message: info });
    }
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(info);
    }
  }

  function isAllowedImageFile(file) {
    if (!file) {
      return false;
    }
    const type = (file.type || '').toLowerCase();
    if (ALLOWED_IMAGE_TYPES.includes(type)) {
      return true;
    }
    const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';
    const ext = name.includes('.') ? name.split('.').pop() : '';
    return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
  }

  function compressImageFile(file, targetSize = 180) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reject(new Error('read-error'));
      };
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('canvas-unavailable'));
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetSize, targetSize);
          const scale = Math.min(targetSize / img.width, targetSize / img.height);
          const drawWidth = Math.max(1, Math.round(img.width * scale));
          const drawHeight = Math.max(1, Math.round(img.height * scale));
          const offsetX = Math.round((targetSize - drawWidth) / 2);
          const offsetY = Math.round((targetSize - drawHeight) / 2);
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error('blob-error'));
              return;
            }
            const resultReader = new FileReader();
            resultReader.onerror = () => reject(new Error('encode-error'));
            resultReader.onload = () => {
              resolve(resultReader.result);
            };
            resultReader.readAsDataURL(blob);
          }, 'image/jpeg', 0.82);
        };
        img.onerror = () => {
          reject(new Error('image-error'));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
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
        return;
      }

      if (!isAllowedImageFile(file)) {
        notifyPhotoIssue('Formato não suportado. Use JPG, JPEG, PNG, GIF ou WEBP.');
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
        return;
      }

      if (file.size > MAX_PHOTO_SIZE) {
        notifyPhotoIssue('O arquivo excede o limite de 3 MB.');
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
        return;
      }

      showPhotoProgress();
      setPhotoProgress(10);

      compressImageFile(file)
        .then(dataUrl => {
          setPhotoProgress(80);
          pendingPhotoData = dataUrl;
          updatePhotoPreview(pendingPhotoData, { animate: true });
          updatePublishButtonState();
          setPhotoProgress(100);
          hidePhotoProgress(220);
        })
        .catch(error => {
          console.warn('Não foi possível processar a foto selecionada.', error);
          pendingPhotoData = null;
          notifyPhotoIssue('Falha ao processar a imagem selecionada.');
          updatePublishButtonState();
        })
        .finally(() => {
          if (inputEl && typeof inputEl.value === 'string') {
            inputEl.value = '';
          }
        });
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
      updatePhotoPreview(profileData.photo);
      persistProfileChanges();
      updatePublishButtonState();
    });
  }
});
