window.PLAYTALK_GAME_CONFIG = { deferAutoStart: true };

(() => {
  const JOURNEY_STARTED_KEY = 'playtalk-journey-started';
  const PROGRESS_STORAGE_KEY = 'vocabulary-progress';
  const COMPLETION_STORAGE_KEY = 'vocabulary-last-complete';

  const journeyPanel = document.getElementById('journey-panel');
  const journeyButton = document.getElementById('journey-start-btn');
  const journeyReset = document.getElementById('journey-reset-btn');
  const gamePanel = document.getElementById('home-game');

  const safeParse = (key) => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  };

  const hasStoredProgress = () => {
    const stored = safeParse(PROGRESS_STORAGE_KEY);
    return Boolean(stored && stored.level && stored.phase && Array.isArray(stored.cycle));
  };

  const hasStoredCompletion = () => {
    const stored = safeParse(COMPLETION_STORAGE_KEY);
    return Boolean(stored && stored.completedLevel);
  };

  const hasJourneyStarted = () => (
    localStorage.getItem(JOURNEY_STARTED_KEY) === 'true'
    || hasStoredProgress()
    || hasStoredCompletion()
  );

  const updateJourneyButtons = () => {
    if (!journeyButton || !journeyReset) return;
    if (hasJourneyStarted()) {
      journeyButton.textContent = 'Continuar Jornada';
      journeyReset.classList.remove('is-hidden');
      return;
    }
    journeyButton.textContent = 'Iniciar Jornada';
    journeyReset.classList.add('is-hidden');
  };

  const showHome = () => {
    if (journeyPanel) journeyPanel.classList.remove('is-hidden');
    if (gamePanel) {
      gamePanel.classList.add('is-hidden');
      gamePanel.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('game-active');
    if (window.location.hash !== '#home') {
      window.location.hash = '#home';
    }
    updateJourneyButtons();
  };

  const showGame = () => {
    if (journeyPanel) journeyPanel.classList.add('is-hidden');
    if (gamePanel) {
      gamePanel.classList.remove('is-hidden');
      gamePanel.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('game-active');
    if (window.location.hash !== '#home') {
      window.location.hash = '#home';
    }
  };

  const startJourney = () => {
    showGame();
    if (!window.playtalkGame) return;
    if (hasJourneyStarted()) {
      window.playtalkGame.resumeJourney();
      return;
    }
    window.playtalkGame.startNewJourney();
  };

  const resetJourney = () => {
    if (window.playtalkGame) {
      window.playtalkGame.resetJourney();
    }
    updateJourneyButtons();
  };

  if (journeyButton) {
    journeyButton.addEventListener('click', startJourney);
  }

  if (journeyReset) {
    journeyReset.addEventListener('click', resetJourney);
  }

  window.addEventListener('DOMContentLoaded', () => {
    showHome();
  });
})();
