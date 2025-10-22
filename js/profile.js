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

  function saveProfile() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(profileData));
    } catch (error) {
      console.warn('Não foi possível salvar o perfil.', error);
    }
  }

  if (profileData.name && nameField) {
    nameField.value = profileData.name;
  }

  if (profileData.photo && photoPreview) {
    photoPreview.style.backgroundImage = `url(${profileData.photo})`;
    photoPreview.classList.add('has-photo');
  }

  if (nameField) {
    nameField.addEventListener('input', () => {
      profileData.name = nameField.value.trim();
      saveProfile();
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        profileData.photo = reader.result;
        if (photoPreview) {
          photoPreview.style.backgroundImage = `url(${reader.result})`;
          photoPreview.classList.add('has-photo');
        }
        saveProfile();
      };
      reader.readAsDataURL(file);
    });
  }
});
