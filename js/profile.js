function initProfilePage(context = {}) {
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
  const emailField = scope.querySelector('#profile-email');
  const emailSendButton = scope.querySelector('#profile-email-send');
  const emailCodeField = scope.querySelector('#profile-email-code');
  const emailVerifyButton = scope.querySelector('#profile-email-verify');
  const emailStatus = scope.querySelector('#profile-verification-status');
  const emailHint = scope.querySelector('#profile-email-hint');

  const VERIFICATION_COOLDOWN_SECONDS = 60;

  const previewDefaultText = photoPlaceholder && typeof photoPlaceholder.textContent === 'string'
    ? photoPlaceholder.textContent.trim()
    : (photoPreview ? photoPreview.textContent : '');

  const emailVerificationState = {
    lastSentAt: null,
    retryAfterSeconds: VERIFICATION_COOLDOWN_SECONDS,
    cooldownInterval: null
  };
  let emailActionInFlight = false;

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

  function setEmailStatusMessage(message, tone = 'info') {
    if (!emailStatus) {
      return;
    }
    emailStatus.textContent = message || '';
    emailStatus.dataset.tone = tone || 'info';
  }

  function setEmailHintMessage(message) {
    if (!emailHint) {
      return;
    }
    emailHint.textContent = message || '';
  }

  function getCooldownRemainingSeconds() {
    if (!emailVerificationState.lastSentAt) {
      return 0;
    }
    const elapsed = Math.floor((Date.now() - emailVerificationState.lastSentAt) / 1000);
    const limit = emailVerificationState.retryAfterSeconds || VERIFICATION_COOLDOWN_SECONDS;
    return Math.max(0, limit - elapsed);
  }

  function startCooldownTimer() {
    if (emailVerificationState.cooldownInterval) {
      clearInterval(emailVerificationState.cooldownInterval);
    }

    const tick = () => {
      const remaining = getCooldownRemainingSeconds();
      updateVerificationButtons();
      if (remaining <= 0 && emailVerificationState.cooldownInterval) {
        clearInterval(emailVerificationState.cooldownInterval);
        emailVerificationState.cooldownInterval = null;
      }
    };

    tick();
    emailVerificationState.cooldownInterval = setInterval(tick, 1000);
  }

  function updateCurrentUserCache(updates = {}) {
    if (!updates || typeof updates !== 'object') {
      return currentUser;
    }

    if (authAPI && typeof authAPI.updateCurrentUser === 'function') {
      const updated = authAPI.updateCurrentUser(updates);
      currentUser = updated;
      return updated;
    }

    if (!currentUser) {
      return null;
    }

    const merged = { ...currentUser, ...updates };
    try {
      localStorage.setItem('currentUser', JSON.stringify(merged));
      window.currentUser = merged;
    } catch (error) {
      console.warn('Não foi possível salvar o usuário atualizado.', error);
    }
    currentUser = merged;
    return merged;
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function updateVerificationButtons() {
    const hasUser = Boolean(currentUser && currentUser.key);
    const emailValue = emailField && typeof emailField.value === 'string'
      ? emailField.value.trim()
      : '';
    const codeValue = emailCodeField && typeof emailCodeField.value === 'string'
      ? emailCodeField.value.trim()
      : '';
    const cooldown = getCooldownRemainingSeconds();
    const verified = Boolean(currentUser && currentUser.emailVerified);

    if (emailSendButton) {
      const baseLabel = verified ? 'Reenviar código' : 'Enviar código';
      emailSendButton.disabled = !hasUser || !emailValue || emailActionInFlight || cooldown > 0;
      emailSendButton.textContent = cooldown > 0 ? `Reenviar (${cooldown}s)` : baseLabel;
    }

    if (emailVerifyButton) {
      const isValidCode = /^[0-9]{4}$/.test(codeValue);
      emailVerifyButton.disabled = !hasUser || verified || emailActionInFlight || !isValidCode;
    }

    if (emailCodeField) {
      emailCodeField.disabled = verified || !hasUser;
    }
  }

  function applyUserVerificationState(user) {
    const effectiveUser = user || null;
    const emailValue = (effectiveUser && effectiveUser.email) || '';
    const verified = Boolean(effectiveUser && effectiveUser.emailVerified);

    if (!effectiveUser) {
      setEmailStatusMessage('Entre para definir e confirmar seu e-mail.', 'neutral');
      setEmailHintMessage('Faça login para receber o código de 4 dígitos por e-mail.');
      emailVerificationState.lastSentAt = null;
      emailVerificationState.retryAfterSeconds = VERIFICATION_COOLDOWN_SECONDS;
      if (emailVerificationState.cooldownInterval) {
        clearInterval(emailVerificationState.cooldownInterval);
        emailVerificationState.cooldownInterval = null;
      }
      if (emailField) {
        emailField.value = '';
      }
      if (emailCodeField) {
        emailCodeField.value = '';
      }
    } else if (verified && emailValue) {
      const verifiedAtText = effectiveUser.emailVerifiedAt
        ? ` em ${formatDateTime(effectiveUser.emailVerifiedAt)}`
        : '';
      setEmailStatusMessage(`E-mail confirmado${verifiedAtText}.`, 'success');
      setEmailHintMessage(`Vamos usar ${emailValue} para enviar novos códigos se você precisar.`);
      if (emailField) {
        emailField.value = emailValue;
      }
    } else if (emailValue) {
      setEmailStatusMessage('Envie e confirme o código de 4 dígitos recebido por e-mail.', 'info');
      setEmailHintMessage(`Vamos mandar o código para ${emailValue}.`);
      if (emailField) {
        emailField.value = emailValue;
      }
    } else {
      setEmailStatusMessage('Defina um e-mail para receber seu código de 4 dígitos.', 'neutral');
      setEmailHintMessage('Use um e-mail que você acesse para confirmar sua conta.');
    }

    updateVerificationButtons();
  }

  async function postJSON(path, payload) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok || (data && data.success === false)) {
      const message = data && data.message ? data.message : `Erro na requisição (${response.status})`;
      const err = new Error(message);
      err.data = data;
      throw err;
    }

    return data || {};
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
      setPhotoStatusMessage('Processando foto...');

      try {
        setPhotoProgress(35);
        const compressedData = await compressImage(file);
        setPhotoStatusMessage('Ajustando visual...');
        setPhotoProgress(70);
        pendingPhotoData = compressedData;
        updatePhotoPreview(pendingPhotoData);
        updatePublishButtonState();
        setPhotoProgress(100);
        hidePhotoProgress(200, { message: 'Foto pronta!' });
      } catch (error) {
        console.warn('Não foi possível processar a foto selecionada.', error);
        const message = error && error.message ? error.message : 'Falha ao processar foto';
        hidePhotoProgress(0, { message, success: false });
        alert(error && error.message
          ? `Não foi possível usar esta imagem: ${error.message}`
          : 'Não foi possível processar sua imagem. Tente novamente com outro arquivo.');
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

  function sanitizeCodeValue(value) {
    return (value || '').replace(/[^0-9]/g, '').slice(0, 4);
  }

  async function handleSendEmailCode() {
    if (!currentUser || !currentUser.key) {
      setEmailStatusMessage('Entre ou crie uma conta para receber seu código por e-mail.', 'neutral');
      if (authAPI && typeof authAPI.openLoginFlow === 'function') {
        authAPI.openLoginFlow();
      }
      return;
    }

    const emailValue = emailField && typeof emailField.value === 'string'
      ? emailField.value.trim()
      : '';

    if (!emailValue || !emailValue.includes('@')) {
      setEmailStatusMessage('Informe um e-mail válido para receber o código.', 'error');
      return;
    }

    emailActionInFlight = true;
    updateVerificationButtons();
    setEmailStatusMessage('Enviando código...', 'info');

    try {
      const response = await postJSON('/api/email/verification-code', {
        key: currentUser.key,
        email: emailValue
      });
      emailVerificationState.lastSentAt = Date.now();
      emailVerificationState.retryAfterSeconds = response.retryAfterSeconds || VERIFICATION_COOLDOWN_SECONDS;
      startCooldownTimer();

      const nextEmail = response.email || emailValue;
      updateCurrentUserCache({
        email: nextEmail,
        emailVerified: Boolean(response.emailVerified),
        emailVerifiedAt: response.emailVerifiedAt || null
      });

      setEmailStatusMessage('Enviamos sua senha de 4 dígitos. Confira seu e-mail.', 'success');
    } catch (error) {
      const retrySeconds = error && error.data && error.data.retryAfterSeconds;
      if (retrySeconds) {
        emailVerificationState.lastSentAt = Date.now();
        emailVerificationState.retryAfterSeconds = retrySeconds;
        startCooldownTimer();
      }
      const message = error && error.message
        ? error.message
        : 'Não foi possível enviar o código.';
      setEmailStatusMessage(message, 'error');
    } finally {
      emailActionInFlight = false;
      updateVerificationButtons();
    }
  }

  async function handleVerifyEmailCode() {
    if (!currentUser || !currentUser.key) {
      setEmailStatusMessage('Entre para confirmar a senha enviada ao seu e-mail.', 'neutral');
      if (authAPI && typeof authAPI.openLoginFlow === 'function') {
        authAPI.openLoginFlow();
      }
      return;
    }

    const codeValue = sanitizeCodeValue(emailCodeField ? emailCodeField.value : '');
    if (emailCodeField && emailCodeField.value !== codeValue) {
      emailCodeField.value = codeValue;
    }

    if (!/^[0-9]{4}$/.test(codeValue)) {
      setEmailStatusMessage('Digite os 4 dígitos recebidos por e-mail.', 'error');
      return;
    }

    emailActionInFlight = true;
    updateVerificationButtons();
    setEmailStatusMessage('Validando código...', 'info');

    try {
      const response = await postJSON('/api/email/verify', {
        key: currentUser.key,
        code: codeValue
      });

      const verifiedAt = response.emailVerifiedAt || new Date().toISOString();
      const nextEmail = response.email || (currentUser && currentUser.email) || '';
      updateCurrentUserCache({
        email: nextEmail,
        emailVerified: true,
        emailVerifiedAt: verifiedAt
      });

      setEmailStatusMessage('E-mail confirmado! Obrigado.', 'success');
      if (emailCodeField) {
        emailCodeField.value = '';
      }
      if (emailVerificationState.cooldownInterval) {
        clearInterval(emailVerificationState.cooldownInterval);
        emailVerificationState.cooldownInterval = null;
      }
    } catch (error) {
      const attemptsLeft = error && error.data && Number.isFinite(error.data.attemptsLeft)
        ? error.data.attemptsLeft
        : null;
      const suffix = attemptsLeft === null ? '' : ` (${attemptsLeft} tentativas restantes)`;
      const message = (error && error.message) || 'Não foi possível confirmar o código.';
      setEmailStatusMessage(`${message}${suffix}`, 'error');
    } finally {
      emailActionInFlight = false;
      updateVerificationButtons();
    }
  }

  if (emailField) {
    emailField.addEventListener('input', () => {
      updateVerificationButtons();
      if (!emailField.value.trim()) {
        setEmailStatusMessage('Defina um e-mail para receber seu código de 4 dígitos.', 'neutral');
      }
    });
  }

  if (emailCodeField) {
    emailCodeField.addEventListener('input', () => {
      const sanitized = sanitizeCodeValue(emailCodeField.value);
      if (sanitized !== emailCodeField.value) {
        emailCodeField.value = sanitized;
      }
      updateVerificationButtons();
    });
  }

  if (emailSendButton) {
    emailSendButton.addEventListener('click', handleSendEmailCode);
  }

  if (emailVerifyButton) {
    emailVerifyButton.addEventListener('click', handleVerifyEmailCode);
  }

  document.addEventListener('playtalk:user-change', (event) => {
    const nextUser = event && event.detail && event.detail.user
      ? event.detail.user
      : (authAPI && typeof authAPI.getCurrentUser === 'function'
        ? authAPI.getCurrentUser()
        : null);
    currentUser = nextUser;
    applyUserVerificationState(currentUser);
  });

  applyUserVerificationState(currentUser);
}

if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
  window.registerPlaytalkPage('page-profile', initProfilePage);
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initProfilePage(), { once: true });
} else {
  initProfilePage();
}
