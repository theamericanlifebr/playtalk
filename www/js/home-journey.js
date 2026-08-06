window.PLAYTALK_GAME_CONFIG = { deferAutoStart: true };

(() => {
  const JOURNEY_STARTED_KEY = 'playtalk-journey-started';
  const PROGRESS_STORAGE_KEY = 'vocabulary-progress';
  const COMPLETION_STORAGE_KEY = 'vocabulary-last-complete';
  const MAIN_MODE_STORAGE_KEY = 'playtalk-main-mode';
  const EXPLORER_LEVEL_STORAGE_KEY = 'playtalk-explorer-level';
  const CARD_COUNT_STORAGE_KEY = 'playtalk-cards-per-journey';
  const MAIN_MODES = new Set(['explorer', 'cards']);
  const MIN_LEVEL = 1;
  const MAX_LEVEL = 10;

  const journeyPanel = document.getElementById('journey-panel');
  const journeyButton = document.getElementById('journey-start-btn');
  const journeyReset = document.getElementById('journey-reset-btn');
  const journeyCardCount = document.getElementById('journey-card-count');
  const journeyCardsOption = document.querySelector('.journey-cards-option');
  const journeyLevelPicker = document.getElementById('journey-level-picker');
  const journeyPhaseSelect = document.getElementById('journey-phase-select');
  const journeyLevelPrev = document.getElementById('journey-level-prev');
  const journeyLevelNext = document.getElementById('journey-level-next');
  const modeButtons = Array.from(document.querySelectorAll('[data-journey-mode]'));
  const gamePanel = document.getElementById('home-game');
  let selectedMode = readMainMode();

  function safeParse(key) {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function readMainMode() {
    const stored = localStorage.getItem(MAIN_MODE_STORAGE_KEY);
    return MAIN_MODES.has(stored) ? stored : 'explorer';
  }

  function readExplorerLevel() {
    const stored = Number.parseInt(localStorage.getItem(EXPLORER_LEVEL_STORAGE_KEY) || '1', 10);
    return Number.isFinite(stored) ? Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, stored)) : MIN_LEVEL;
  }

  function getSelectedLevel() {
    const selected = Number.parseInt((journeyPhaseSelect && journeyPhaseSelect.value) || '1', 10);
    return Number.isFinite(selected) ? Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, selected)) : MIN_LEVEL;
  }

  function saveSelectedLevel(level) {
    const normalized = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Number(level) || MIN_LEVEL));
    localStorage.setItem(EXPLORER_LEVEL_STORAGE_KEY, String(normalized));
    if (journeyPhaseSelect) journeyPhaseSelect.value = String(normalized);
    updateJourneyButtons();
  }

  function hasStoredProgress() {
    const stored = safeParse(PROGRESS_STORAGE_KEY);
    return Boolean(stored && stored.level && stored.phase && Array.isArray(stored.cycle));
  }

  function hasStoredCompletion() {
    const stored = safeParse(COMPLETION_STORAGE_KEY);
    return Boolean(stored && stored.completedLevel);
  }

  function hasJourneyStarted() {
    return localStorage.getItem(JOURNEY_STARTED_KEY) === 'true'
      || hasStoredProgress()
      || hasStoredCompletion();
  }

  function updateJourneyButtons() {
    if (!journeyButton || !journeyReset) return;
    const cardsMode = selectedMode === 'cards';
    if (journeyCardsOption) journeyCardsOption.hidden = !cardsMode;
    if (journeyLevelPicker) journeyLevelPicker.hidden = cardsMode;
    modeButtons.forEach(button => {
      const active = button.dataset.journeyMode === selectedMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (!cardsMode) {
      journeyButton.textContent = `Jogar nível ${getSelectedLevel()}`;
      journeyReset.classList.add('is-hidden');
      return;
    }

    journeyButton.textContent = hasJourneyStarted() ? 'Continuar Modo Cartas' : 'Iniciar Modo Cartas';
    journeyReset.classList.toggle('is-hidden', !hasJourneyStarted());
  }

  function selectMode(mode) {
    if (!MAIN_MODES.has(mode)) return;
    selectedMode = mode;
    localStorage.setItem(MAIN_MODE_STORAGE_KEY, mode);
    updateJourneyButtons();
  }

  function showHome() {
    if (journeyPanel) journeyPanel.classList.remove('is-hidden');
    if (gamePanel) {
      gamePanel.classList.add('is-hidden');
      gamePanel.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('game-active');
    if (window.location.hash !== '#home') window.location.hash = '#home';
    selectedMode = readMainMode();
    saveSelectedLevel(readExplorerLevel());
  }

  function showGame() {
    if (journeyPanel) journeyPanel.classList.add('is-hidden');
    if (gamePanel) {
      gamePanel.classList.remove('is-hidden');
      gamePanel.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('game-active');
    if (window.location.hash !== '#home') window.location.hash = '#home';
  }

  function getSelectedCardCount() {
    const count = Number.parseInt((journeyCardCount && journeyCardCount.value) || '8', 10);
    return Number.isFinite(count) && count > 0 ? count : 8;
  }

  function restoreCardCount() {
    if (!journeyCardCount) return;
    const stored = Number.parseInt(localStorage.getItem(CARD_COUNT_STORAGE_KEY) || '', 10);
    const optionExists = Array.from(journeyCardCount.options).some(option => Number(option.value) === stored);
    if (optionExists) journeyCardCount.value = String(stored);
  }

  function startCardsMode() {
    showGame();
    if (!window.playtalkGame) return;
    if (hasJourneyStarted()) {
      window.playtalkGame.resumeJourney({ flashcardCount: getSelectedCardCount() });
      return;
    }
    window.playtalkGame.startNewJourney({ flashcardCount: getSelectedCardCount() });
  }

  function startExplorerMode() {
    showGame();
    if (!window.playtalkGame || typeof window.playtalkGame.startSinglePhase !== 'function') return;
    const level = getSelectedLevel();
    saveSelectedLevel(level);
    window.playtalkGame.startSinglePhase(level);
  }

  function startSelectedMode() {
    if (selectedMode === 'cards') {
      startCardsMode();
      return;
    }
    startExplorerMode();
  }

  function resetJourney() {
    if (window.playtalkGame) window.playtalkGame.resetJourney();
    updateJourneyButtons();
  }

  function moveExplorerLevel(offset) {
    const current = getSelectedLevel();
    const next = current + offset > MAX_LEVEL
      ? MIN_LEVEL
      : (current + offset < MIN_LEVEL ? MAX_LEVEL : current + offset);
    saveSelectedLevel(next);
  }

  if (journeyButton) journeyButton.addEventListener('click', startSelectedMode);
  if (journeyReset) journeyReset.addEventListener('click', resetJourney);
  if (journeyLevelPrev) journeyLevelPrev.addEventListener('click', () => moveExplorerLevel(-1));
  if (journeyLevelNext) journeyLevelNext.addEventListener('click', () => moveExplorerLevel(1));
  if (journeyPhaseSelect) journeyPhaseSelect.addEventListener('change', () => saveSelectedLevel(getSelectedLevel()));
  if (journeyCardCount) {
    journeyCardCount.addEventListener('change', () => {
      localStorage.setItem(CARD_COUNT_STORAGE_KEY, String(getSelectedCardCount()));
    });
  }
  modeButtons.forEach(button => button.addEventListener('click', () => selectMode(button.dataset.journeyMode)));

  window.addEventListener('playtalk:return-home', showHome);
  window.addEventListener('DOMContentLoaded', () => {
    restoreCardCount();
    showHome();
  });
})();
