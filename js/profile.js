function initProfilePage(context = {}) {
  const storage = window.playtalkStorage;
  const scope = context && context.container ? context.container : document;
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

  const usernameField = scope.querySelector('#profile-username');
  const nameField = scope.querySelector('#profile-name');
  const photoInput = scope.querySelector('#profile-photo');
  const photoPreview = scope.querySelector('#profile-photo-preview');
  const photoImage = scope.querySelector('#profile-photo-image');
  const photoPlaceholder = scope.querySelector('#profile-photo-placeholder');
  const photoStatus = scope.querySelector('#profile-photo-status');
  const publishButton = scope.querySelector('#profile-photo-publish');
  const shareCheckbox = scope.querySelector('#profile-share-results');

  const previewDefaultText = photoPlaceholder && typeof photoPlaceholder.textContent === 'string'
    ? photoPlaceholder.textContent.trim()
    : (photoPreview ? photoPreview.textContent : '');

  let progressHideTimeout = null;
  const MAX_UPLOAD_SIZE = 3 * 1024 * 1024;
  const ACCEPTED_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/x-png',
    'image/gif',
    'image/webp'
  ]);
  const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  function getFileExtension(filename) {
    if (typeof filename !== 'string') {
      return '';
    }
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.slice(lastDot).toLowerCase();
  }

  function isAllowedFileType(file) {
    if (!file) {
      return false;
    }
    if (file.type && ACCEPTED_TYPES.has(file.type.toLowerCase())) {
      return true;
    }
    return ACCEPTED_EXTENSIONS.includes(getFileExtension(file.name || ''));
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 180;
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');
          if (!context) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Canvas não disponível.'));
            return;
          }
          const scale = Math.max(size / image.width, size / image.height);
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;
          const offsetX = (size - drawWidth) / 2;
          const offsetY = (size - drawHeight) / 2;
          context.clearRect(0, 0, size, size);
          context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
          const dataUrl = canvas.toDataURL('image/webp', 0.82);
          URL.revokeObjectURL(objectUrl);
          resolve(dataUrl);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Não foi possível carregar a imagem.'));
      };
      image.src = objectUrl;
    });
  }

  function setPhotoProgress(value) {
    if (!photoPreview) {
      return;
    }
    const normalized = Math.max(0, Math.min(100, Math.round(value)));
    photoPreview.style.setProperty('--upload-progress', normalized);
  }

  function setPhotoStatusMessage(message) {
    if (photoStatus) {
      photoStatus.textContent = message || '';
    }
  }

  function showPhotoProgress() {
    if (!photoPreview) {
      return;
    }
    if (progressHideTimeout) {
      clearTimeout(progressHideTimeout);
      progressHideTimeout = null;
    }
    photoPreview.dataset.uploading = 'true';
    setPhotoStatusMessage('Carregando foto...');
    setPhotoProgress(0);
  }

  function hidePhotoProgress(delay = 0, options = {}) {
    if (!photoPreview) {
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
    const isSuccess = !options || options.success !== false;
    progressHideTimeout = setTimeout(() => {
      if (message) {
        setPhotoStatusMessage(message);
        if (isSuccess) {
          setPhotoProgress(100);
        }
      }
      progressHideTimeout = setTimeout(() => {
        setPhotoStatusMessage('');
        photoPreview.removeAttribute('data-uploading');
        setPhotoProgress(0);
        progressHideTimeout = null;
      }, 700);
    }, hideDelay);
  }

  function updatePhotoPreview(photoData) {
    if (!photoPreview) {
      return;
    }
    const hasPhoto = Boolean(photoData && typeof photoData === 'string' && photoData.trim());
    if (hasPhoto) {
      if (photoImage) {
        photoImage.src = photoData;
        photoImage.hidden = false;
        photoImage.classList.add('profile-photo-preview__image--visible');
        photoImage.classList.remove('profile-photo-preview__image--dissolve');
        void photoImage.offsetWidth;
        photoImage.classList.add('profile-photo-preview__image--dissolve');
        photoImage.addEventListener('animationend', () => {
          photoImage.classList.remove('profile-photo-preview__image--dissolve');
        }, { once: true });
      }
      if (photoPlaceholder) {
        photoPlaceholder.hidden = true;
      }
      photoPreview.classList.add('has-photo');
    } else {
      if (photoImage) {
        photoImage.src = '';
        photoImage.hidden = true;
        photoImage.classList.remove('profile-photo-preview__image--visible');
        photoImage.classList.remove('profile-photo-preview__image--dissolve');
      }
      if (photoPlaceholder) {
        photoPlaceholder.hidden = false;
        photoPlaceholder.textContent = previewDefaultText || 'Adicione uma foto';
      } else {
        photoPreview.textContent = previewDefaultText || 'Adicione uma foto';
      }
      photoPreview.classList.remove('has-photo');
    }
  }

  const username = (currentUser && currentUser.username) || 'convidado';
  if (usernameField) {
    usernameField.value = username;
  }

  const storageKey = `profile:${username}`;
  let profileData = {};
  try {
    const stored = storage.getItem(storageKey);
    profileData = stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Não foi possível carregar os dados de perfil salvos.', error);
    profileData = {};
  }

  const storedAvatar = storage.getItem('avatar');
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
      storage.setItem('avatar', photoData);
    } else {
      storage.removeItem('avatar');
    }
  }

  function saveProfile() {
    try {
      storage.setItem(storageKey, JSON.stringify(profileData));
      persistAvatarValue(profileData.photo);
    } catch (error) {
      console.warn('Não foi possível salvar o perfil.', error);
    }
  }

  const storedDisplayName = (() => {
    const saved = storage.getItem('displayName');
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

  const storedShare = storage.getItem('shareResults');
  const shareEnabled = storedShare !== null
    ? storedShare === 'true'
    : Boolean(profileData.shareResults);

  profileData.shareResults = shareEnabled;
  if (shareCheckbox) {
    shareCheckbox.checked = shareEnabled;
  }
  if (storedShare === null) {
    storage.setItem('shareResults', shareEnabled ? 'true' : 'false');
  }
  if (storedDisplayName && !storage.getItem('displayName')) {
    storage.setItem('displayName', storedDisplayName);
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
      storage.setItem('displayName', value);
      schedulePersist();
    });
  }

  if (shareCheckbox) {
    shareCheckbox.addEventListener('change', () => {
      const enabled = shareCheckbox.checked;
      profileData.shareResults = enabled;
      storage.setItem('shareResults', enabled ? 'true' : 'false');
      persistProfileChanges();
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', async event => {
      const inputEl = event.target;
      const file = inputEl.files && inputEl.files[0];
      if (!file) {
        return;
      }

      if (!isAllowedFileType(file)) {
        alert('Formato de arquivo não suportado. Utilize JPG, JPEG, PNG, GIF ou WEBP.');
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
        return;
      }

      if (file.size > MAX_UPLOAD_SIZE) {
        alert('A foto deve ter no máximo 3 MB.');
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
        return;
      }

      showPhotoProgress();
      setPhotoProgress(10);
      setPhotoStatusMessage('Processando foto...');

      try {
        setPhotoProgress(35);
        const compressedData = await compressImage(file);
        setPhotoProgress(85);
        pendingPhotoData = compressedData;
        updatePhotoPreview(pendingPhotoData);
        updatePublishButtonState();
        setPhotoProgress(100);
        hidePhotoProgress(200);
      } catch (error) {
        console.warn('Não foi possível processar a foto selecionada.', error);
        hidePhotoProgress(0, { message: 'Falha ao processar foto', success: false });
        alert('Não foi possível processar sua imagem. Tente novamente com outro arquivo.');
      } finally {
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
      }
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
}

if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
  window.registerPlaytalkPage('page-profile', initProfilePage);
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initProfilePage(), { once: true });
} else {
  initProfilePage();
}
