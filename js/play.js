(function() {
  const MODE_CONFIG = [
    { id: 1, title: 'Vocabulary', logline: 'Panorama geral com seu melhor ritmo.', color: '#c8e54a' },
    { id: 2, title: 'Explore', logline: 'Interpretações certeiras, no tom dourado.', color: '#ffd700' },
    { id: 3, title: 'Listening', logline: 'Audição afiada e respostas rápidas.', color: '#ff6c3e' },
    { id: 4, title: 'Reading', logline: 'Leitura premium e foco total.', color: '#2196f3' },
    { id: 5, title: 'Building', logline: 'Traduções quentes com clareza.', color: '#1b004b' },
    { id: 6, title: 'Fluent', logline: 'Raciocínio afiado em ritmo multicolorido.', color: '#c8e54a' }
  ];

  const FLUENCY_MULTIPLIER = {
    1: 1.20,
    2: 1.25,
    3: 1.25,
    4: 1.15,
    5: 1.75,
    6: 1.75
  };

  const DEFAULT_AVATAR_URL = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';

  const GENERAL_META = {
    id: null,
    title: 'Painel geral',
    logline: 'Visão macro com o desempenho combinado dos modos.'
  };

  const modeLogoAPI = window.playtalkModeLogos || null;

  function buildModeLogo(mode, extraClass = '') {
    if (modeLogoAPI && typeof modeLogoAPI.createModeLogoElement === 'function') {
      const logo = modeLogoAPI.createModeLogoElement(mode || 1, extraClass);
      logo.setAttribute('aria-hidden', 'true');
      return logo;
    }
    const fallback = document.createElement('div');
    fallback.className = ['mode-logo', extraClass].filter(Boolean).join(' ');
    fallback.dataset.mode = String(mode || 1);
    fallback.setAttribute('aria-hidden', 'true');
    return fallback;
  }


  const MEDAL_CONFIG = [
    { key: 'diamante', label: 'Diamante', icon: 'medalhas/diamante.png' },
    { key: 'ouro', label: 'Ouro', icon: 'medalhas/ouro.png' },
    { key: 'prata', label: 'Prata', icon: 'medalhas/prata.png' },
    { key: 'bronze', label: 'Bronze', icon: 'medalhas/bronze.png' }
  ];

  let statsData = {};
  let activeMode = null;

  function formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${seconds}s`;
  }

  function formatWords(totalChars) {
    const words = Math.max(0, Math.floor((Number(totalChars) || 0) / 5));
    return formatInteger(words);
  }

  function formatBalanceValue() {
    const balanceAPI = window.playtalkBalance;
    const rawBalance = balanceAPI && typeof balanceAPI.getBalance === 'function'
      ? balanceAPI.getBalance()
      : 0;
    const normalized = Number.isFinite(Number(rawBalance)) ? Number(rawBalance) : 0;
    return normalized.toLocaleString('pt-BR');
  }

  function getJoinDateInfo() {
    const user = window.playtalkAuth && typeof window.playtalkAuth.getCurrentUser === 'function'
      ? window.playtalkAuth.getCurrentUser()
      : null;
    const candidates = [
      localStorage.getItem('firstLoginAt'),
      user && (user.createdAt || user.created_at),
      user && user.data && (user.data.createdAt || user.data.created_at)
    ].filter(Boolean);
    let rawDate = candidates.find(Boolean) || null;
    if (!rawDate) {
      rawDate = new Date().toISOString();
      localStorage.setItem('firstLoginAt', rawDate);
    }
    const parsed = rawDate ? new Date(rawDate) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

  function formatInteger(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0';
    return Math.max(0, Math.floor(number)).toLocaleString('pt-BR');
  }

  function formatPercent(value) {
    const number = Number(value);
    const safe = Number.isFinite(number) ? Math.max(0, Math.min(number, 100)) : 0;
    return safe.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }

  function formatCps(value) {
    const number = Number(value);
    const safe = Number.isFinite(number)
      ? Math.max(0, Math.round(number * 100) / 100)
      : 0;
    return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseJSON(value, fallback = null) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (err) {
      console.warn('Não foi possível interpretar os dados locais.', err);
      return fallback;
    }
  }

  function getStoredGeneralLevel() {
    const headerLevel = document.getElementById('header-level');
    if (headerLevel && headerLevel.textContent) {
      const match = headerLevel.textContent.match(/(\d+)/);
      if (match && Number.isFinite(Number(match[1]))) {
        return Math.max(1, Math.floor(Number(match[1])));
      }
    }

    const storedGeneral = parseJSON(localStorage.getItem('generalProgress'), null);
    if (storedGeneral && Number.isFinite(storedGeneral.level)) {
      return Math.max(1, Math.floor(storedGeneral.level));
    }

    const legacy = parseJSON(localStorage.getItem('levelProgress'), null);
    if (legacy && Number.isFinite(legacy.level)) {
      return Math.max(1, Math.floor(legacy.level));
    }

    return 1;
  }

  function getStoredModeLevel(mode) {
    const storedModes = parseJSON(localStorage.getItem('modeProgress'), {});
    if (storedModes && storedModes[String(mode)] && Number.isFinite(storedModes[String(mode)].level)) {
      return Math.max(1, Math.floor(storedModes[String(mode)].level));
    }
    return 1;
  }

  function getPerformanceLevel(mode) {
    if (!mode) {
      return getStoredGeneralLevel();
    }
    return getStoredModeLevel(mode);
  }

  function getCurrentDisplayName() {
    const authAPI = window.playtalkAuth;
    const user = authAPI && typeof authAPI.getCurrentUser === 'function'
      ? authAPI.getCurrentUser()
      : null;
    const stored = localStorage.getItem('displayName');
    if (stored && stored.trim()) {
      return stored.trim();
    }
    if (user && user.data && user.data.displayName) {
      return user.data.displayName;
    }
    return (user && user.username) || 'Jogador';
  }

  function getFluencyMultiplier(mode) {
    const multiplier = FLUENCY_MULTIPLIER[String(mode || '')];
    if (!Number.isFinite(multiplier)) return 1;
    return multiplier;
  }

  function calcFluencyScore(summary, mode) {
    const cpm = Math.max(0, Math.round((summary.cps || 0) * 60));
    const multiplier = getFluencyMultiplier(mode);
    const score = Math.max(0, Math.round(cpm * multiplier));
    return { score, multiplier, cpm };
  }

  function getEmptyMedalCounts() {
    return {
      diamante: 0,
      ouro: 0,
      prata: 0,
      bronze: 0
    };
  }

  function normalizeMedals(medals) {
    const base = getEmptyMedalCounts();
    if (!medals || typeof medals !== 'object') {
      return base;
    }
    MEDAL_CONFIG.forEach(({ key }) => {
      const value = Number(medals[key]);
      base[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });
    return base;
  }

  function hasMedals(medals) {
    return MEDAL_CONFIG.some(({ key }) => (medals[key] || 0) > 0);
  }

  function refreshStatsData() {
    statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');
  }

  function calcModeStats(mode) {
    const stats = statsData[mode] || {};
    const totalPhrases = stats.totalPhrases || 0;
    const correctPhrases = stats.correct || 0;
    const totalTime = stats.totalTime || 0;
    const report = stats.report || 0;
    const totalChars = stats.totalChars || 0;
    const correctChars = stats.correctChars || 0;
    const wrong = stats.wrong || Math.max(0, totalPhrases - correctPhrases);
    const accuracyPerc = totalPhrases ? (correctPhrases / totalPhrases * 100) : 0;
    const seconds = totalTime > 0 ? (totalTime / 1000) : 0;
    const cps = seconds > 0 ? (correctChars / seconds) : 0;
    const noReportPerc = totalPhrases ? (100 - (report / totalPhrases * 100)) : 100;
    return {
      totalPhrases,
      correctPhrases,
      totalChars,
      correctChars,
      wrongPhrases: wrong,
      accuracyPerc,
      cps,
      noReportPerc,
      totalTime,
      reportCount: report,
      medals: normalizeMedals(stats.medals),
      bestStreak: Math.max(0, Math.floor(stats.bestStreak || 0)),
      currentStreak: Math.max(0, Math.floor(stats.currentStreak || 0))
    };
  }

  function calcGeneralStats() {
    const modes = [2, 3, 4, 5, 6];
    const totals = {
      totalPhrases: 0,
      correctPhrases: 0,
      totalChars: 0,
      correctChars: 0,
      wrongPhrases: 0,
      totalTime: 0,
      report: 0,
      medals: getEmptyMedalCounts()
    };
    modes.forEach((mode) => {
      const stats = statsData[mode] || {};
      totals.totalPhrases += stats.totalPhrases || 0;
      totals.correctPhrases += stats.correct || 0;
      totals.totalChars += stats.totalChars || 0;
      totals.correctChars += stats.correctChars || 0;
      totals.wrongPhrases += (stats.wrong || Math.max(0, (stats.totalPhrases || 0) - (stats.correct || 0)));
      totals.totalTime += stats.totalTime || 0;
      totals.report += stats.report || 0;
      const medals = normalizeMedals(stats.medals);
      MEDAL_CONFIG.forEach(({ key }) => {
        totals.medals[key] += medals[key];
      });
    });
    const accuracyPerc = totals.totalPhrases
      ? (totals.correctPhrases / totals.totalPhrases) * 100
      : 0;
    const seconds = totals.totalTime > 0 ? (totals.totalTime / 1000) : 0;
    const cps = seconds > 0 ? (totals.correctChars / seconds) : 0;
    const noReportPerc = totals.totalPhrases
      ? (100 - (totals.report / totals.totalPhrases * 100))
      : 100;
    const currentStreak = Math.max(0, parseInt(localStorage.getItem('currentStreak') || '0', 10));
    const bestStreak = Math.max(currentStreak, Math.max(0, parseInt(localStorage.getItem('bestStreak') || '0', 10)));
    return {
      totalPhrases: totals.totalPhrases,
      correctPhrases: totals.correctPhrases,
      totalChars: totals.totalChars,
      correctChars: totals.correctChars,
      wrongPhrases: totals.wrongPhrases,
      accuracyPerc,
      cps,
      noReportPerc,
      totalTime: totals.totalTime,
      reportCount: totals.report,
      medals: totals.medals,
      bestStreak,
      currentStreak
    };
  }

  function getSummary(mode) {
    if (!mode) return calcGeneralStats();
    return calcModeStats(mode);
  }

  function createMedalsSection(summary) {
    const section = document.createElement('section');
    section.className = 'stats-section stats-section--medals';
    const header = document.createElement('div');
    header.className = 'stats-section__header';
    const title = document.createElement('h2');
    title.textContent = 'Quadro de medalhas';
    header.appendChild(title);
    section.appendChild(header);

    const counts = normalizeMedals(summary.medals);
    const list = document.createElement('ul');
    list.className = 'stats-medal-board__grid';
    const visibleMedals = MEDAL_CONFIG.filter(({ key }) => key !== 'bronze');
    visibleMedals.forEach(({ key, label, icon }) => {
      const count = counts[key];
      const item = document.createElement('li');
      item.className = 'stats-medal-board__item';
      if (!count) {
        item.classList.add('stats-medal-board__item--empty');
      }
      const image = document.createElement('img');
      image.className = 'stats-medal-board__icon';
      image.src = icon;
      image.alt = label;
      const value = document.createElement('span');
      value.className = 'stats-medal-board__value';
      value.textContent = formatInteger(count);
      item.appendChild(image);
      item.appendChild(value);
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  function createPerformanceSection(summary, mode) {
    const section = document.createElement('section');
    section.className = 'stats-section stats-section--performance';

    const header = document.createElement('div');
    header.className = 'stats-section__header';
    const title = document.createElement('h2');
    title.textContent = 'Desempenho';
    header.appendChild(title);
    section.appendChild(header);

    const playerName = getCurrentDisplayName();
    const levelValue = getPerformanceLevel(mode);
    const accuracyPerc = Math.max(0, Math.min(Number(summary.accuracyPerc) || 0, 100));
    const accuracyLabel = formatPercent(accuracyPerc);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'performance-card';
    card.setAttribute('aria-label', `${playerName}, nível ${formatInteger(levelValue)}, precisão de ${accuracyLabel}`);

    const glow = document.createElement('div');
    glow.className = 'performance-card__glow';
    card.appendChild(glow);

    const body = document.createElement('div');
    body.className = 'performance-card__body';

    const lineTop = document.createElement('div');
    lineTop.className = 'performance-card__line performance-card__line--top';
    body.appendChild(lineTop);

    const lineBottom = document.createElement('div');
    lineBottom.className = 'performance-card__line performance-card__line--bottom';
    body.appendChild(lineBottom);

    const content = document.createElement('div');
    content.className = 'performance-card__content';

    const player = document.createElement('div');
    player.className = 'performance-card__player';

    const level = document.createElement('div');
    level.className = 'performance-card__level';
    const levelRing = document.createElement('div');
    levelRing.className = 'performance-card__level-ring';
    const levelCore = document.createElement('div');
    levelCore.className = 'performance-card__level-core';
    const levelLabel = document.createElement('span');
    levelLabel.className = 'performance-card__level-label';
    levelLabel.textContent = `L${formatInteger(levelValue)}`;
    level.appendChild(levelRing);
    level.appendChild(levelCore);
    level.appendChild(levelLabel);

    const textBlock = document.createElement('div');
    textBlock.className = 'performance-card__text';
    const nameRow = document.createElement('div');
    nameRow.className = 'performance-card__name-row';
    const name = document.createElement('span');
    name.className = 'performance-card__name';
    name.textContent = playerName;
    const dot = document.createElement('div');
    dot.className = 'performance-card__dot';
    nameRow.appendChild(name);
    nameRow.appendChild(dot);

    const progress = document.createElement('div');
    progress.className = 'performance-card__progress';
    progress.setAttribute('role', 'presentation');
    const progressFill = document.createElement('div');
    progressFill.className = 'performance-card__progress-fill';
    progressFill.style.width = `${accuracyPerc}%`;
    progress.appendChild(progressFill);

    const accuracySr = document.createElement('span');
    accuracySr.className = 'sr-only';
    accuracySr.textContent = `Precisão: ${accuracyLabel}`;

    textBlock.appendChild(nameRow);
    textBlock.appendChild(progress);
    textBlock.appendChild(accuracySr);

    player.appendChild(level);
    player.appendChild(textBlock);

    const status = document.createElement('div');
    status.className = 'performance-card__status';
    const statusIcon = document.createElement('div');
    statusIcon.className = 'performance-card__status-icon';
    statusIcon.innerHTML = '<svg stroke="currentColor" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path></svg>';
    const statusGlow = document.createElement('div');
    statusGlow.className = 'performance-card__status-glow';
    statusIcon.appendChild(statusGlow);

    const statusLabel = document.createElement('span');
    statusLabel.className = 'performance-card__status-label';
    statusLabel.textContent = 'READY';

    const statusDots = document.createElement('div');
    statusDots.className = 'performance-card__status-dots';
    statusDots.setAttribute('aria-hidden', 'true');
    statusDots.appendChild(document.createElement('span'));
    statusDots.appendChild(document.createElement('span'));
    statusDots.appendChild(document.createElement('span'));

    status.appendChild(statusIcon);
    status.appendChild(statusLabel);
    status.appendChild(statusDots);

    content.appendChild(player);
    content.appendChild(status);

    body.appendChild(content);
    card.appendChild(body);

    section.appendChild(card);

    return section;
  }

  function createHero(summary, modeMeta) {
    const wrapper = document.createElement('section');
    wrapper.className = 'stats-hero';
    const visual = document.createElement('div');
    visual.className = 'stats-hero__visual';
    const badge = document.createElement('div');
    badge.className = 'stats-hero__badge';
    const heroLogo = buildModeLogo(modeMeta.id || 1, 'mode-logo--overlay');
    badge.appendChild(heroLogo);
    const title = document.createElement('h1');
    title.className = 'stats-title';
    title.textContent = modeMeta.title;
    visual.appendChild(badge);
    visual.appendChild(title);
    wrapper.appendChild(visual);
    return wrapper;
  }

  function createPlayerStatsSection(summary) {
    const section = document.createElement('section');
    section.className = 'stats-section stats-section--totals';
    const header = document.createElement('div');
    header.className = 'stats-section__header';
    const title = document.createElement('h2');
    title.textContent = 'Estatísticas';
    header.appendChild(title);
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'stats-list';

    const wrong = Math.max(0, summary.wrongPhrases || (summary.totalPhrases - summary.correctPhrases));
    const reportRate = wrong > 0 ? (summary.reportCount || 0) / wrong * 100 : 0;
    const joinDate = getJoinDateInfo();

    const entries = [
      { label: 'Frases totais', value: formatInteger(summary.totalPhrases || 0) },
      { label: 'Frases certas', value: formatInteger(summary.correctPhrases || 0) },
      { label: 'Frases erradas', value: formatInteger(wrong) },
      { label: 'Palavras faladas', value: formatWords(summary.totalChars) },
      { label: 'Tempo de jogo', value: formatDuration(summary.totalTime) },
      { label: 'Reports', value: formatPercent(reportRate) },
      { label: 'No PlayTalk desde', value: joinDate
        ? joinDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : '—' },
      { label: 'Saldo', value: `R$ ${formatBalanceValue()}` }
    ];

    entries.forEach(({ label, value }) => {
      const row = document.createElement('div');
      row.className = 'stats-list__item';
      const rowLabel = document.createElement('span');
      rowLabel.className = 'stats-list__label';
      rowLabel.textContent = label;
      const rowValue = document.createElement('span');
      rowValue.className = 'stats-list__value';
      rowValue.textContent = value;
      row.appendChild(rowLabel);
      row.appendChild(rowValue);
      list.appendChild(row);
    });

    section.appendChild(list);
    return section;
  }

  function createModeSelector(onSelect, currentMode = null) {
    const section = document.createElement('section');
    section.className = 'stats-mode-selector';
    section.setAttribute('aria-label', 'Selecionar modo de jogo para a lente');

    const track = document.createElement('div');
    track.className = 'stats-mode-selector__track';
    section.appendChild(track);

    const buttons = [];

    function updateStates(active) {
      section.classList.toggle('has-selection', Boolean(active));
      buttons.forEach(btn => {
        const isActive = btn.dataset.mode === String(active);
        btn.classList.toggle('is-active', isActive);
      });
    }

    MODE_CONFIG.forEach(config => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stats-mode-selector__button';
      button.dataset.mode = config.id;
      button.setAttribute('aria-pressed', currentMode === config.id ? 'true' : 'false');
      button.setAttribute('title', config.title);

      const rgb = hexToRgb(config.color || '#3fd286');
      button.style.setProperty('--mode-color-rgb', rgb);
      const logo = buildModeLogo(config.id, 'stats-mode-selector__icon mode-logo--small');
      button.appendChild(logo);

      button.addEventListener('click', () => {
        const modeId = parseInt(button.dataset.mode, 10);
        const nextMode = activeMode === modeId ? null : modeId;
        activeMode = nextMode;
        buttons.forEach(btn => {
          const isActive = btn === button && nextMode;
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        updateStates(nextMode);
        onSelect(nextMode);
      });

      buttons.push(button);
      track.appendChild(button);
    });

    updateStates(currentMode);

    return section;
  }

  function hexToRgb(hex) {
    const int = parseInt(hex.slice(1), 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }

  function applyLens(mode) {
    if (window.playtalkLens && typeof window.playtalkLens.applyLens === 'function') {
      window.playtalkLens.applyLens(mode);
    }
  }

  function hideLens() {
    if (window.playtalkLens && typeof window.playtalkLens.hideLens === 'function') {
      window.playtalkLens.hideLens();
    }
  }

  function swapSection(container, oldSection, newSection) {
    if (!oldSection || !oldSection.parentNode) {
      container.insertBefore(newSection, container.firstChild);
      return newSection;
    }
    container.replaceChild(newSection, oldSection);
    return newSection;
  }

  function initPlayPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const container = scope.querySelector('#play-content');
    if (!container) return;

    refreshStatsData();
    activeMode = null;

    const summary = getSummary(activeMode);
    const modeMeta = GENERAL_META;

    container.innerHTML = '';
    let heroSection = createHero(summary, modeMeta);
    container.appendChild(heroSection);
    const selector = createModeSelector((mode) => {
      const newSummary = getSummary(mode);
      const meta = mode ? (MODE_CONFIG.find(item => item.id === mode) || GENERAL_META) : GENERAL_META;
      const updatedHero = createHero(newSummary, meta);
      heroSection = swapSection(container, heroSection, updatedHero);
      const newMedals = createMedalsSection(newSummary);
      medalsSection = swapSection(container, medalsSection, newMedals);
      const newPerformance = createPerformanceSection(newSummary, mode);
      performanceSection = swapSection(container, performanceSection, newPerformance);
      const newPlayerStats = createPlayerStatsSection(newSummary);
      playerStatsSection = swapSection(container, playerStatsSection, newPlayerStats);
      if (mode) {
        applyLens(mode);
      } else {
        applyLens('stats');
      }
    }, activeMode);
    container.appendChild(selector);
    let medalsSection = createMedalsSection(summary);
    container.appendChild(medalsSection);
    let performanceSection = createPerformanceSection(summary, activeMode);
    container.appendChild(performanceSection);

    let playerStatsSection = createPlayerStatsSection(summary);
    container.appendChild(playerStatsSection);

    if (activeMode) {
      applyLens(activeMode);
    } else {
      applyLens('stats');
    }

    if (modeLogoAPI && typeof modeLogoAPI.renderAllModeLogos === 'function') {
      modeLogoAPI.renderAllModeLogos(container);
    }

    document.addEventListener('playtalk:user-change', () => {
      refreshStatsData();
      const updated = getSummary(activeMode);
      const meta = activeMode ? (MODE_CONFIG.find(item => item.id === activeMode) || GENERAL_META) : GENERAL_META;
      const refreshedHero = createHero(updated, meta);
      heroSection = swapSection(container, heroSection, refreshedHero);
      const refreshedMedals = createMedalsSection(updated);
      medalsSection = swapSection(container, medalsSection, refreshedMedals);
      const refreshedPerformance = createPerformanceSection(updated, activeMode);
      performanceSection = swapSection(container, performanceSection, refreshedPerformance);
      const refreshedPlayerStats = createPlayerStatsSection(updated);
      playerStatsSection = swapSection(container, playerStatsSection, refreshedPlayerStats);
    });
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-play', initPlayPage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initPlayPage(), { once: true });
  } else {
    initPlayPage();
  }
})();
