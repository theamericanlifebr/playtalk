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
    avatar.src = entry.avatar;
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

  function renderRanking(data) {
    if (!listElement) {
      return;
    }

    const sorted = [...data]
      .sort((a, b) => (b.level - a.level) || (a.position - b.position))
      .slice(0, 100);

    listElement.innerHTML = '';
    sorted.forEach(entry => {
      listElement.appendChild(buildCard(entry));
    });

    showStatus(sorted.length ? '' : 'Nenhum jogador encontrado.');
  }

  async function loadRanking() {
    try {
      const response = await fetch('data/ranking.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar ranking: ${response.status}`);
      }
      const data = await response.json();
      renderRanking(data);
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
