document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('fun-game-overlay');
  const frame = document.getElementById('fun-game-frame');
  const closeButton = document.getElementById('fun-game-close');

  const getStoredDay = () => {
    const stored = Number.parseInt(localStorage.getItem('vocabulary-level') || '', 10);
    return Number.isFinite(stored) && stored > 0 ? stored : 1;
  };

  const openGame = (mode) => {
    if (!overlay || !frame) return;
    const day = getStoredDay();
    if (mode === 'memory') {
      frame.src = `memory-game.html?day=${encodeURIComponent(day)}`;
    } else {
      frame.src = `index.html?mode=${encodeURIComponent(mode)}&day=${encodeURIComponent(day)}&source=flashcards#home`;
    }
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
  };

  const closeGame = () => {
    if (!overlay || !frame) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    frame.src = '';
  };

  document.querySelectorAll('[data-game-mode]').forEach(button => {
    button.addEventListener('click', () => {
      const mode = button.dataset.gameMode;
      if (mode) {
        openGame(mode);
      }
    });
  });

  if (closeButton) {
    closeButton.addEventListener('click', closeGame);
  }

  if (overlay) {
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        closeGame();
      }
    });
  }
});
