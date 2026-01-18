(function () {
  const TOTAL_LEVELS = 200;
  const STORAGE_KEY = 'vocabulary-medals';
  const TIME_STORAGE_KEY = 'vocabulary-level-times';
  const grid = document.getElementById('medal-grid');
  const modal = document.getElementById('medal-modal');
  const modalTitle = document.getElementById('medal-modal-title');
  const modalTime = document.getElementById('medal-modal-time');
  const modalClose = document.getElementById('medal-modal-close');
  const modalReplay = document.getElementById('medal-modal-replay');
  const medalImages = {
    diamante: 'medalhas/diamante.png',
    ouro: 'medalhas/ouro.png',
    prata: 'medalhas/prata.png'
  };

  function readLevelTimeStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(TIME_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function readMedalStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) {
      return 'Tempo não registrado.';
    }
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    }
    return `${seconds}s`;
  }

  function openModal(levelNumber, bestTime) {
    if (!modal || !modalTitle || !modalTime) return;
    modalTitle.textContent = `Nível ${levelNumber}`;
    modalTime.textContent = `Melhor tempo: ${formatDuration(bestTime)}`;
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
    modal.dataset.level = String(levelNumber);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
    delete modal.dataset.level;
  }

  function handleReplay() {
    if (!modal) return;
    const levelNumber = Number(modal.dataset.level);
    if (!Number.isFinite(levelNumber) || levelNumber <= 0) return;
    localStorage.setItem('vocabulary-level', String(levelNumber));
    localStorage.removeItem('vocabulary-progress');
    localStorage.removeItem('vocabulary-last-complete');
    window.location.href = 'game.html';
  }

  function createMedalCard(levelNumber, medalKey, isEarned) {
    const card = document.createElement('div');
    card.className = 'medal-card';

    const image = document.createElement('img');
    image.src = medalImages[medalKey] || medalImages.prata;
    image.alt = `Medalha ${medalKey}`;

    const label = document.createElement('span');
    label.textContent = `Nivel ${levelNumber}`;

    card.appendChild(image);
    card.appendChild(label);

    if (isEarned) {
      card.classList.add('medal-card--earned');
      card.classList.add('medal-card--clickable');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Abrir detalhes do nível ${levelNumber}`);
    }

    return card;
  }

  function renderGrid() {
    if (!grid) return;
    const medals = readMedalStorage();
    const levelTimes = readLevelTimeStorage();
    grid.innerHTML = '';

    for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
      const storedKey = medals[String(level)];
      const key = storedKey || 'prata';
      const isEarned = Boolean(storedKey);
      const card = createMedalCard(level, key, isEarned);
      if (isEarned) {
        const bestTime = levelTimes[String(level)];
        const openDetails = () => openModal(level, bestTime);
        card.addEventListener('click', openDetails);
        card.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDetails();
          }
        });
      }
      grid.appendChild(card);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderGrid();
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }
    if (modalReplay) {
      modalReplay.addEventListener('click', handleReplay);
    }
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          closeModal();
        }
      });
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    });
  });
})();
