(() => {
  const DEFAULT_AVATAR_URL =
    'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';

  const grid = document.querySelector('[data-users-grid]');
  const status = document.querySelector('[data-users-status]');
  const searchInput = document.querySelector('[data-users-search]');
  const modal = document.querySelector('[data-users-modal]');
  const modalAvatar = document.querySelector('[data-modal-avatar]');
  const modalName = document.querySelector('[data-modal-name]');
  const modalLevel = document.querySelector('[data-modal-level]');
  const modalTime = document.querySelector('[data-modal-time]');
  const modalLevelValue = document.querySelector('[data-modal-level-value]');
  const modalMessage = document.querySelector('[data-modal-message]');
  const levelForm = document.querySelector('[data-level-form]');
  const levelInput = document.querySelector('[data-level-input]');
  const deleteButton = document.querySelector('[data-delete-user]');
  const closeButtons = document.querySelectorAll('[data-users-modal-close]');

  let users = [];
  let selectedUser = null;

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  function normalizeName(user) {
    return (user.username || user.displayName || '').trim() || 'Sem nome';
  }

  function getUserLevel(user) {
    return user.data?.generalProgress?.level || 1;
  }

  function normalizeAvatar(user) {
    const avatar = user.data?.avatar || DEFAULT_AVATAR_URL;
    if (!avatar) {
      return DEFAULT_AVATAR_URL;
    }
    return avatar;
  }

  async function resolveAvatarUrl(avatar) {
    if (!avatar || avatar.startsWith('data:') || avatar.startsWith('http')) {
      return avatar || DEFAULT_AVATAR_URL;
    }
    try {
      const response = await fetch(`/api/media/resolve?filename=${encodeURIComponent(avatar)}`);
      if (!response.ok) {
        return avatar;
      }
      const payload = await response.json();
      if (payload?.success && payload.url) {
        return payload.url;
      }
      return avatar;
    } catch (error) {
      console.warn('Erro ao resolver avatar', error);
      return avatar;
    }
  }

  function updateStatus(message) {
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
  }

  function setMessage(message, isError = false) {
    if (!modalMessage) return;
    modalMessage.textContent = message;
    modalMessage.classList.toggle('is-error', isError);
  }

  function openModal(user) {
    selectedUser = user;
    setMessage('');
    const name = normalizeName(user);
    const level = getUserLevel(user);
    modalName.textContent = name;
    modalLevel.textContent = `Nível ${level}`;
    modalTime.textContent = formatTime(user.data?.totalTime || 0);
    modalLevelValue.textContent = level;
    levelInput.value = level;
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    resolveAvatarUrl(normalizeAvatar(user)).then((url) => {
      modalAvatar.src = url || DEFAULT_AVATAR_URL;
    });
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    selectedUser = null;
  }

  function renderUsers(list) {
    grid.innerHTML = '';

    if (!list.length) {
      updateStatus('Nenhum usuário encontrado.');
      return;
    }

    updateStatus('');

    list.forEach((user) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'users-admin__card';

      const avatar = document.createElement('img');
      avatar.className = 'users-admin__avatar';
      avatar.alt = `Foto de ${normalizeName(user)}`;
      avatar.src = DEFAULT_AVATAR_URL;

      resolveAvatarUrl(normalizeAvatar(user)).then((url) => {
        avatar.src = url || DEFAULT_AVATAR_URL;
      });

      const info = document.createElement('div');
      info.className = 'users-admin__info';

      const name = document.createElement('span');
      name.className = 'users-admin__name';
      name.textContent = normalizeName(user);

      const level = document.createElement('span');
      level.className = 'users-admin__level';
      level.textContent = `Nível ${getUserLevel(user)}`;

      info.appendChild(name);
      info.appendChild(level);

      card.appendChild(avatar);
      card.appendChild(info);
      card.addEventListener('click', () => openModal(user));

      grid.appendChild(card);
    });
  }

  function filterUsers(term) {
    const normalized = term.trim().toLowerCase();
    if (!normalized) {
      renderUsers(users);
      return;
    }
    const filtered = users.filter(user =>
      normalizeName(user).toLowerCase().includes(normalized)
    );
    renderUsers(filtered);
  }

  async function fetchUsers() {
    updateStatus('Carregando usuários...');
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Falha ao carregar usuários');
      }
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.message || 'Falha ao carregar usuários');
      }
      users = Object.entries(payload.users || {}).map(([key, value]) => ({
        key,
        ...value,
        data: value.data || {}
      }));
      users.sort((a, b) => normalizeName(a).localeCompare(normalizeName(b), 'pt-BR'));
      renderUsers(users);
    } catch (error) {
      console.error(error);
      updateStatus('Não foi possível carregar os usuários.');
    }
  }

  async function updateUserLevel(level) {
    if (!selectedUser) return;
    const currentProgress = selectedUser.data?.generalProgress || { level: 1, xp: 0 };

    const payload = {
      key: selectedUser.key,
      data: {
        generalProgress: {
          level,
          xp: currentProgress.xp || 0
        }
      }
    };

    const response = await fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Falha ao atualizar nível');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Falha ao atualizar nível');
    }

    selectedUser.data.generalProgress = payload.data.generalProgress;
  }

  async function deleteUser() {
    if (!selectedUser) return;
    const response = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: selectedUser.key })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Falha ao excluir usuário');
    }

    const payload = await response.json();
    if (!payload.success) {
      throw new Error(payload.message || 'Falha ao excluir usuário');
    }
  }

  searchInput?.addEventListener('input', (event) => {
    filterUsers(event.target.value);
  });

  levelForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const levelValue = Number(levelInput.value);
    if (!Number.isFinite(levelValue) || levelValue <= 0) {
      setMessage('Informe um nível válido.', true);
      return;
    }

    try {
      setMessage('Atualizando nível...');
      await updateUserLevel(levelValue);
      modalLevel.textContent = `Nível ${levelValue}`;
      modalLevelValue.textContent = levelValue;
      setMessage('Nível atualizado com sucesso!');
      await fetchUsers();
    } catch (error) {
      console.error(error);
      setMessage(error.message, true);
    }
  });

  deleteButton?.addEventListener('click', async () => {
    if (!selectedUser) return;
    const confirmDelete = window.confirm(`Deseja excluir ${normalizeName(selectedUser)}?`);
    if (!confirmDelete) return;

    try {
      setMessage('Excluindo usuário...');
      await deleteUser();
      closeModal();
      await fetchUsers();
    } catch (error) {
      console.error(error);
      setMessage(error.message, true);
    }
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hasAttribute('hidden')) {
      closeModal();
    }
  });

  fetchUsers();
})();
