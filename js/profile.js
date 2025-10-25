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

  const previewDefaultText = photoPreview ? photoPreview.textContent : '';

  if (photoPreview) {
    photoPreview.classList.remove('profile-photo-preview--icon');
  }

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

  function updatePhotoPreview(photoData) {
    if (!photoPreview) {
      return;
    }
    if (photoData && typeof photoData === 'string' && photoData.trim()) {
      photoPreview.style.backgroundImage = `url(${photoData})`;
      photoPreview.style.background = '';
      photoPreview.classList.add('has-photo');
      photoPreview.classList.remove('profile-photo-preview--icon');
      photoPreview.textContent = '';
      photoPreview.classList.remove('profile-photo-preview--fade-in');
      void photoPreview.offsetWidth;
      photoPreview.classList.add('profile-photo-preview--fade-in');
      photoPreview.addEventListener('animationend', () => {
        photoPreview.classList.remove('profile-photo-preview--fade-in');
      }, { once: true });
    } else {
      photoPreview.style.backgroundImage = '';
      photoPreview.classList.remove('has-photo');
      photoPreview.classList.remove('profile-photo-preview--icon');
      photoPreview.style.background = '';
      photoPreview.textContent = previewDefaultText || 'Adicione uma foto';
      photoPreview.classList.remove('profile-photo-preview--fade-in');
    }
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
      if (photoProgressText) {
        photoProgressText.textContent = 'Processando foto...';
      }

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
        hidePhotoProgress(0, { message: 'Falha ao processar foto' });
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
});
