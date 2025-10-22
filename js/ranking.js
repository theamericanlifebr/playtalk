(function() {
  const listElement = document.getElementById('ranking-list');
  const statusElement = document.getElementById('ranking-status');

  function showStatus(message, isError = false) {
    if (!statusElement) {
      return;
    }
    statusElement.textContent = message;
    statusElement.classList.toggle('ranking-status--error', Boolean(isError));
    statusElement.hidden = !message;
  }

  function buildCard(entry) {
    const card = document.createElement('article');
    card.className = 'ranking-card';
    if (entry.position <= 3) {
      card.classList.add('ranking-card--top');
    }

    const position = document.createElement('span');
    position.className = 'ranking-position';
    position.textContent = `#${entry.position}`;
    card.appendChild(position);

    const avatar = document.createElement('img');
    avatar.className = 'ranking-avatar';
    avatar.src = entry.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(entry.name)}`;
    avatar.alt = `Foto de perfil de ${entry.name}`;
    card.appendChild(avatar);

    const info = document.createElement('div');
    info.className = 'ranking-info';

    const name = document.createElement('h2');
    name.className = 'ranking-name';
    name.textContent = entry.name;
    info.appendChild(name);

    const level = document.createElement('p');
    level.className = 'ranking-level';
    level.textContent = `Nível ${entry.level}`;
    info.appendChild(level);

    card.appendChild(info);
    return card;
  }

  function prepareRanking(staticEntries = [], sharedEntries = []) {
    const combined = new Map();

    staticEntries
      .filter(entry => entry && entry.name)
      .forEach(entry => {
        const key = entry.name.trim().toLowerCase();
        combined.set(key, { ...entry, originalPosition: Number(entry.position) || Number.MAX_SAFE_INTEGER });
      });

    sharedEntries
      .filter(player => player && player.name)
      .forEach(player => {
        const key = (player.username || player.name).trim().toLowerCase();
        const base = combined.get(key);
        if (base) {
          const baseLevel = Number(base.level) || 0;
          if (player.level > baseLevel) {
            base.level = player.level;
          }
          if (!base.avatar && player.avatar) {
            base.avatar = player.avatar;
          }
        } else {
          combined.set(key, {
            name: player.name,
            level: player.level,
            avatar: player.avatar,
            originalPosition: Number.MAX_SAFE_INTEGER
          });
        }
      });

    return Array.from(combined.values())
      .sort((a, b) => {
        const levelDiff = (Number(b.level) || 0) - (Number(a.level) || 0);
        if (levelDiff !== 0) {
          return levelDiff;
        }
        const posDiff = (Number(a.originalPosition) || Number.MAX_SAFE_INTEGER) - (Number(b.originalPosition) || Number.MAX_SAFE_INTEGER);
        if (posDiff !== 0) {
          return posDiff;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, 100)
      .map((entry, index) => {
        const { originalPosition, ...rest } = entry;
        return { ...rest, position: index + 1 };
      });
  }

  function renderRanking(staticEntries, sharedEntries = []) {
    if (!listElement) {
      return;
    }

    const prepared = prepareRanking(staticEntries, sharedEntries);

    listElement.innerHTML = '';
    prepared.forEach(entry => {
      listElement.appendChild(buildCard(entry));
    });

    showStatus(prepared.length ? '' : 'Nenhum jogador encontrado.');
  }

  async function fetchSharedPlayers() {
    try {
      const response = await fetch('/api/users', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar usuários (${response.status})`);
      }
      const payload = await response.json();
      const users = payload && payload.users ? Object.values(payload.users) : [];
      return users
        .filter(entry => entry && entry.data && entry.data.shareResults)
        .map(entry => {
          const level = Number(entry.data.pastaAtual) || 1;
          const displayName = (entry.data.displayName && entry.data.displayName.trim()) || entry.username || 'Jogador';
          return {
            username: entry.username,
            name: displayName,
            level,
            avatar: entry.data.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(entry.username || displayName)}`
          };
        });
    } catch (error) {
      console.warn('Não foi possível carregar jogadores que compartilham resultados:', error);
      return [];
    }
  }

  async function fetchRankingBase() {
    try {
      const response = await fetch('data/ranking.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar ranking: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Erro ao carregar ranking base:', error);
      return [];
    }
  }

  async function loadRanking() {
    try {
      const [baseRanking, sharedPlayers] = await Promise.all([
        fetchRankingBase(),
        fetchSharedPlayers()
      ]);
      renderRanking(baseRanking, sharedPlayers);
    } catch (error) {
      console.error('Erro ao carregar ranking', error);
      showStatus('Não foi possível carregar o ranking agora. Tente novamente mais tarde.', true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (statusElement) {
      statusElement.hidden = false;
    }
    loadRanking();
  });
})();
