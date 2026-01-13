(function () {
  const TOTAL_LEVELS = 200;
  const STORAGE_KEY = 'vocabulary-medals';
  const grid = document.getElementById('medal-grid');
  const medalImages = {
    diamante: 'medalhas/diamante.png',
    ouro: 'medalhas/ouro.png',
    prata: 'medalhas/prata.png'
  };

  function readMedalStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
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
    }

    return card;
  }

  function renderGrid() {
    if (!grid) return;
    const medals = readMedalStorage();
    grid.innerHTML = '';

    for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
      const storedKey = medals[String(level)];
      const key = storedKey || 'prata';
      const card = createMedalCard(level, key, Boolean(storedKey));
      grid.appendChild(card);
    }
  }

  document.addEventListener('DOMContentLoaded', renderGrid);
})();
