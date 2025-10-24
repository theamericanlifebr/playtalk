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
  const uploadProgress = document.getElementById('profile-upload-progress');
  const progressCircle = document.getElementById('profile-upload-progress-circle');
  const progressValue = document.getElementById('profile-upload-progress-value');

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

  function renderPhotoPreview(source = null) {
    if (!photoPreview) return;
    const photoSource = source !== null ? source : (profileData.photo || '');
    if (photoSource) {
      photoPreview.classList.add('has-photo');
      photoPreview.style.backgroundImage = `url(${photoSource})`;
      photoPreview.style.background = '';
      photoPreview.textContent = '';
    } else {
      photoPreview.classList.remove('has-photo');
      photoPreview.style.backgroundImage = 'none';
      photoPreview.style.background = '';
      photoPreview.textContent = 'Adicione uma foto';
    }
  }

  function updatePublishButtonState() {
    if (!publishButton) return;
    const hasPendingPhoto = pendingPhotoData && pendingPhotoData !== profileData.photo;
    publishButton.disabled = !hasPendingPhoto;
  }

  let hideProgressTimeout = null;

  function setUploadProgress(value) {
    if (!progressCircle || !progressValue) return;
    const safeValue = Math.max(0, Math.min(100, Math.round(value)));
    progressCircle.style.setProperty('--progress', `${safeValue * 3.6}deg`);
    progressValue.textContent = `${safeValue}%`;
  }

  function showUploadProgress() {
    if (!uploadProgress) return;
    if (hideProgressTimeout) {
      clearTimeout(hideProgressTimeout);
      hideProgressTimeout = null;
    }
    uploadProgress.hidden = false;
    setUploadProgress(0);
  }

  function hideUploadProgress(delay = 0) {
    if (!uploadProgress) return;
    if (hideProgressTimeout) {
      clearTimeout(hideProgressTimeout);
      hideProgressTimeout = null;
    }
    hideProgressTimeout = setTimeout(() => {
      uploadProgress.hidden = true;
      hideProgressTimeout = null;
    }, Math.max(0, delay));
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

  renderPhotoPreview();

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
      if (!file) return;
      const reader = new FileReader();
      reader.onloadstart = () => {
        showUploadProgress();
        setUploadProgress(0);
      };
      reader.onprogress = event => {
        if (event && event.lengthComputable) {
          const percent = (event.loaded / event.total) * 100;
          setUploadProgress(percent);
        }
      };
      reader.onload = () => {
        pendingPhotoData = reader.result;
        renderPhotoPreview(pendingPhotoData);
        setUploadProgress(100);
        hideUploadProgress(350);
        updatePublishButtonState();
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
      };
      reader.onerror = () => {
        pendingPhotoData = null;
        renderPhotoPreview();
        updatePublishButtonState();
        hideUploadProgress();
      };
      reader.onloadend = () => {
        if (!pendingPhotoData) {
          hideUploadProgress();
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
      renderPhotoPreview();
      hideUploadProgress();
      persistProfileChanges();
      updatePublishButtonState();
    });
  }
});
