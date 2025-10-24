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
  const photoProgressRing = photoProgress ? photoProgress.querySelector('.profile-photo-progress__ring') : null;
  const photoProgressValue = document.getElementById('profile-photo-progress-value');

  if (photoPreview) {
    photoPreview.classList.remove('profile-photo-preview--icon');
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

  function applyPreviewPhoto(photoData) {
    if (!photoPreview) return;

    if (photoData) {
      photoPreview.style.backgroundImage = `url(${photoData})`;
      photoPreview.style.background = '';
      photoPreview.classList.add('has-photo');
      photoPreview.classList.remove('profile-photo-preview--icon');
      photoPreview.textContent = '';
    } else {
      photoPreview.style.backgroundImage = 'none';
      photoPreview.classList.remove('has-photo');
      photoPreview.textContent = 'Adicione uma foto';
    }
  }

  function setPhotoProgress(percent) {
    if (!photoProgress || !photoProgressRing || !photoProgressValue) return;
    const normalized = Math.max(0, Math.min(100, Number(percent) || 0));
    photoProgress.hidden = false;
    photoProgressRing.style.setProperty('--progress', `${normalized * 3.6}deg`);
    photoProgressValue.textContent = `${Math.round(normalized)}%`;
  }

  function hidePhotoProgress() {
    if (!photoProgress) return;
    photoProgress.hidden = true;
  }

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

  if (profileData.photo) {
    applyPreviewPhoto(profileData.photo);
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
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pendingPhotoData = reader.result;
        applyPreviewPhoto(pendingPhotoData);
        updatePublishButtonState();
        if (inputEl && typeof inputEl.value === 'string') {
          inputEl.value = '';
        }
      };
      reader.addEventListener('loadstart', () => {
        setPhotoProgress(0);
      });
      reader.addEventListener('progress', event => {
        if (event.lengthComputable) {
          const percent = (event.loaded / event.total) * 100;
          setPhotoProgress(percent);
        }
      });
      reader.addEventListener('loadend', () => {
        setPhotoProgress(100);
        setTimeout(() => {
          hidePhotoProgress();
        }, 350);
      });
      reader.addEventListener('error', () => {
        hidePhotoProgress();
      });
      reader.addEventListener('abort', () => {
        hidePhotoProgress();
      });
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
      applyPreviewPhoto(profileData.photo);
      persistProfileChanges();
      updatePublishButtonState();
    });
  }
});
