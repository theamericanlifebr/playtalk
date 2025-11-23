const colorStops = [
  [0, '#ff0000'],
  [2000, '#ff3b00'],
  [4000, '#ff7f00'],
  [6000, '#ffb300'],
  [8000, '#ffe000'],
  [10000, '#ffff66'],
  [12000, '#ccff66'],
  [14000, '#99ff99'],
  [16000, '#00cc66'],
  [18000, '#00994d'],
  [20000, '#00ffff'],
  [22000, '#66ccff'],
  [24000, '#0099ff'],
  [25000, '#0099ff']
];

function hexToRgb(hex) {
  const int = parseInt(hex.slice(1), 16);
  return [int >> 16 & 255, int >> 8 & 255, int & 255];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function calcularCor(pontos) {
  const max = colorStops[colorStops.length - 1][0];
  const p = Math.max(0, Math.min(pontos, max));
  for (let i = 0; i < colorStops.length - 1; i++) {
    const [p1, c1] = colorStops[i];
    const [p2, c2] = colorStops[i + 1];
    if (p >= p1 && p <= p2) {
      const ratio = (p - p1) / (p2 - p1);
      const [r1, g1, b1] = hexToRgb(c1);
      const [r2, g2, b2] = hexToRgb(c2);
      const r = Math.round(r1 + ratio * (r2 - r1));
      const g = Math.round(g1 + ratio * (g2 - g1));
      const b = Math.round(b1 + ratio * (b2 - b1));
      return rgbToHex(r, g, b);
    }
  }
  return colorStops[colorStops.length - 1][1];
}

function colorFromPercent(perc) {
  const max = colorStops[colorStops.length - 1][0];
  return calcularCor((perc / 100) * max);
}

const MEDAL_CONFIG = [
  { key: 'diamante', label: 'Diamante', icon: 'medalhas/diamante.png' },
  { key: 'ouro', label: 'Ouro', icon: 'medalhas/ouro.png' },
  { key: 'prata', label: 'Prata', icon: 'medalhas/prata.png' },
  { key: 'bronze', label: 'Bronze', icon: 'medalhas/bronze.png' }
];

const MODE_LENS_COLORS = {
  1: '#2bd67b',
  2: '#f2c84b',
  3: '#ff9a4d',
  4: '#4aa3ff',
  5: '#b37bff',
  6: '#ff5f6d'
};

const MODE_BANNERS = [
  { mode: 1, title: 'Hub geral', logline: 'Panorama da jornada completa.', color: MODE_LENS_COLORS[1], accent: 'Vocabulary' },
  { mode: 2, title: 'Tradução direta', logline: 'Respostas certeiras em inglês.', color: MODE_LENS_COLORS[2], accent: 'Meaning' },
  { mode: 3, title: 'Listening puro', logline: 'Reflexos afiados só com áudio.', color: MODE_LENS_COLORS[3], accent: 'Listening' },
  { mode: 4, title: 'Reading em inglês', logline: 'Ritmo de leitura premium.', color: MODE_LENS_COLORS[4], accent: 'Reading' },
  { mode: 5, title: 'Tradução reversa', logline: 'Compreensão e produção alinhadas.', color: MODE_LENS_COLORS[5], accent: 'Translating' },
  { mode: 6, title: 'Desafio final', logline: 'Modo Thinking no limite.', color: MODE_LENS_COLORS[6], accent: 'Thinking' }
];

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

function formatInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '0';
  }
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

function createMetricCard(label, value, accentPercent, options = {}) {
  const card = document.createElement('div');
  card.className = 'stat-metric';
  if (options.modifier) {
    card.classList.add(options.modifier);
  }
  const labelEl = document.createElement('span');
  labelEl.className = 'stat-metric__label';
  labelEl.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.className = 'stat-metric__value';
  valueEl.textContent = value;
  if (Number.isFinite(accentPercent)) {
    const clamped = Math.max(0, Math.min(accentPercent, 100));
    valueEl.style.color = colorFromPercent(clamped);
  }
  card.appendChild(labelEl);
  card.appendChild(valueEl);
  if (options.detail) {
    const detailEl = document.createElement('span');
    detailEl.className = 'stat-metric__detail';
    detailEl.textContent = options.detail;
    card.appendChild(detailEl);
  }
  return card;
}

function createMetricsSection(summary = {}) {
  const section = document.createElement('div');
  section.className = 'stats-metrics';
  section.appendChild(createMetricCard('Velocidade', `${formatCps(summary.cps)} cps`));
  section.appendChild(createMetricCard('Precisão', formatPercent(summary.accuracyPerc), summary.accuracyPerc));
  if (Number.isFinite(summary.bestStreak) || Number.isFinite(summary.currentStreak)) {
    const best = Math.max(0, Math.floor(Number.isFinite(summary.bestStreak) ? summary.bestStreak : 0));
    const current = Math.max(0, Math.floor(Number.isFinite(summary.currentStreak) ? summary.currentStreak : 0));
    const detail = `Atual: ${formatInteger(current)}`;
    section.appendChild(createMetricCard('Melhor sequência', formatInteger(best), undefined, {
      modifier: 'stat-metric--streak',
      detail
    }));
  }
  return section;
}

function createStatsSection(title, items) {
  const section = document.createElement('div');
  section.className = 'stats-section';
  if (title) {
    const titleEl = document.createElement('h3');
    titleEl.className = 'stats-section__title';
    titleEl.textContent = title;
    section.appendChild(titleEl);
  }
  const list = document.createElement('div');
  list.className = 'stats-list';
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'stats-list__item';
    const labelEl = document.createElement('span');
    labelEl.className = 'stats-list__label';
    labelEl.textContent = item.label;
    const valueEl = document.createElement('span');
    valueEl.className = 'stats-list__value';
    valueEl.textContent = item.value;
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    list.appendChild(row);
  });
  section.appendChild(list);
  return section;
}

function createMedalsSection(medals) {
  const counts = normalizeMedals(medals);
  const section = document.createElement('div');
  section.className = 'stats-medal-board';
  if (!hasMedals(counts)) {
    const empty = document.createElement('p');
    empty.className = 'stats-medal-board__empty';
    empty.textContent = 'Sem medalhas conquistadas';
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement('ul');
  list.className = 'stats-medal-board__grid';
  MEDAL_CONFIG.forEach(({ key, label, icon }) => {
    const count = counts[key];
    if (!count) {
      return;
    }
    const item = document.createElement('li');
    item.className = 'stats-medal-board__item';
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

function createTotalsSection(summary = {}) {
  const section = createStatsSection(null, [
    { label: 'Frases totais', value: formatInteger(summary.totalPhrases) },
    { label: 'Frases certas', value: formatInteger(summary.correctPhrases) },
    { label: 'Caracteres totais', value: formatInteger(summary.totalChars) },
    { label: 'Caracteres certos', value: formatInteger(summary.correctChars) }
  ]);
  section.classList.add('stats-section--totals');
  return section;
}

function initPlayPage(context = {}) {
  const scope = context && context.container ? context.container : document;
  const container = scope.querySelector('#play-content');
  if (!container) {
    return;
  }
  const modeButtonsContainer = scope.querySelector('#mode-buttons');
  if (!modeButtonsContainer) {
    return;
  }
  container.classList.add('stats-wrapper', 'stats-layout', 'stats-dashboard');
  container.style.transition = 'opacity 0.2s';
  const buttons = scope.querySelectorAll('#mode-buttons img');
  const clickSound = new Audio('gamesounds/mododesbloqueado.mp3');
  let statsData = {};
  let activeMode = 1;
  let activeRankingKey = 'streak';

  const heroSection = document.createElement('section');
  heroSection.className = 'stats-hero ranking-banner has-lens';
  const heroViewport = document.createElement('div');
  heroViewport.className = 'ranking-banner__viewport';
  const heroTrack = document.createElement('div');
  heroTrack.className = 'ranking-banner__track stats-banner__track';
  heroViewport.appendChild(heroTrack);
  heroSection.appendChild(heroViewport);

  const medalsSection = document.createElement('section');
  medalsSection.className = 'stats-card stats-card--medals has-lens';
  const medalsTitle = document.createElement('h2');
  medalsTitle.textContent = 'Quadro de medalhas';
  medalsSection.appendChild(medalsTitle);
  const medalsContent = document.createElement('div');
  medalsContent.className = 'stats-card__body';
  medalsSection.appendChild(medalsContent);

  const numbersSection = document.createElement('section');
  numbersSection.className = 'stats-card stats-card--numbers has-lens';
  const numbersTitle = document.createElement('h2');
  numbersTitle.textContent = 'Números do jogador';
  numbersSection.appendChild(numbersTitle);
  const numbersContent = document.createElement('div');
  numbersContent.className = 'stats-card__body stats-card__body--metrics';
  numbersSection.appendChild(numbersContent);

  const rankingsSection = document.createElement('section');
  rankingsSection.className = 'stats-card stats-card--ranking has-lens';
  const rankingsTitle = document.createElement('h2');
  rankingsTitle.textContent = 'Os 10 melhores';
  rankingsSection.appendChild(rankingsTitle);
  const rankingNav = document.createElement('div');
  rankingNav.className = 'stats-ranking__nav';
  const rankingContent = document.createElement('div');
  rankingContent.className = 'stats-ranking__content';
  rankingsSection.appendChild(rankingNav);
  rankingsSection.appendChild(rankingContent);

  const modesBlock = document.createElement('section');
  modesBlock.className = 'stats-card stats-card--modes';
  const modesTitle = document.createElement('h2');
  modesTitle.textContent = 'Modos de jogo';
  modesBlock.appendChild(modesTitle);
  modesBlock.appendChild(modeButtonsContainer);
  modeButtonsContainer.classList.add('stats-mode-icons');

  container.innerHTML = '';
  container.appendChild(heroSection);
  container.appendChild(medalsSection);
  container.appendChild(numbersSection);
  container.appendChild(rankingsSection);
  container.appendChild(modesBlock);

  function refreshStatsData() {
    statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');
  }
  refreshStatsData();

  function getLensColor(mode) {
    const cssColor = getComputedStyle(document.documentElement).getPropertyValue('--lens-custom-color').trim();
    return cssColor || MODE_LENS_COLORS[mode] || MODE_LENS_COLORS[1];
  }

  function calcModeStats(mode) {
    const stats = statsData[mode] || {};
    const totalPhrases = stats.totalPhrases || 0;
    const correctPhrases = stats.correct || 0;
    const totalTime = stats.totalTime || 0;
    const report = stats.report || 0;
    const totalChars = stats.totalChars || 0;
    const correctChars = stats.correctChars || 0;
    const accuracyPerc = totalPhrases ? (correctPhrases / totalPhrases * 100) : 0;
    const seconds = totalTime > 0 ? (totalTime / 1000) : 0;
    const cps = seconds > 0 ? (correctChars / seconds) : 0;
    const noReportPerc = totalPhrases ? (100 - (report / totalPhrases * 100)) : 100;
    return {
      totalPhrases,
      correctPhrases,
      totalChars,
      correctChars,
      accuracyPerc,
      cps,
      noReportPerc,
      medals: normalizeMedals(stats.medals)
    };
  }

  function calcGeneralStats() {
    const modes = [2, 3, 4, 5, 6];
    const totals = {
      totalPhrases: 0,
      correctPhrases: 0,
      totalChars: 0,
      correctChars: 0,
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
      accuracyPerc,
      cps,
      noReportPerc,
      medals: totals.medals,
      bestStreak,
      currentStreak
    };
  }

  function getSummaryFor(mode) {
    return mode === 1 ? calcGeneralStats() : calcModeStats(mode);
  }

  function renderHero() {
    heroTrack.innerHTML = '';
    MODE_BANNERS.forEach((banner) => {
      const stats = getSummaryFor(banner.mode);
      const card = document.createElement('article');
      card.className = 'ranking-banner__card stats-banner__card';
      card.classList.toggle('is-active', banner.mode === activeMode);
      card.dataset.mode = banner.mode;
      card.style.setProperty('--banner-gradient', `linear-gradient(135deg, ${banner.color}80 0%, ${banner.color}cc 100%)`);
      const content = document.createElement('div');
      content.className = 'ranking-banner__content';
      const eyebrow = document.createElement('p');
      eyebrow.className = 'ranking-banner__eyebrow';
      eyebrow.textContent = `${banner.accent} • Modo ${banner.mode}`;
      const title = document.createElement('h2');
      title.textContent = banner.title;
      const logline = document.createElement('p');
      logline.className = 'ranking-banner__logline';
      logline.textContent = banner.logline;
      content.append(eyebrow, title, logline);

      const meta = document.createElement('div');
      meta.className = 'stats-banner__meta';
      meta.innerHTML = `Precisão ${formatPercent(stats.accuracyPerc)} • ${formatCps(stats.cps)} cps`;

      card.append(content, meta);
      heroTrack.appendChild(card);
    });
    if (window.playtalkLens) {
      window.playtalkLens.applyLens(heroSection, { mode: activeMode, color: getLensColor(activeMode) });
    }
  }

  function renderMedals(summary) {
    medalsContent.innerHTML = '';
    medalsContent.appendChild(createMedalsSection(summary.medals));
    if (window.playtalkLens) {
      window.playtalkLens.applyLens(medalsSection, { mode: activeMode, color: getLensColor(activeMode) });
    }
  }

  function renderNumbers(summary) {
    numbersContent.innerHTML = '';
    numbersContent.appendChild(createMetricsSection(summary));
    numbersContent.appendChild(createTotalsSection(summary));
    if (window.playtalkLens) {
      window.playtalkLens.applyLens(numbersSection, { mode: activeMode, color: getLensColor(activeMode) });
    }
  }

  const rankingTabs = [
    { key: 'streak', label: 'Melhores sequências' },
    { key: 'cpm', label: 'Melhor CPM' },
    { key: 'accuracy', label: 'Mais precisos' },
    { key: 'level', label: 'Mais nível' }
  ];

  function buildSampleRanking(summary) {
    const userName = (document.getElementById('header-username') || {}).textContent || 'Você';
    const baseEntries = Array.from({ length: 9 }).map((_, index) => ({
      name: `Jogador ${index + 1}`,
      streak: Math.max(1, summary.bestStreak || 1) - index,
      cpm: Math.max(0, Math.round(summary.cps * 60) - index * 8),
      accuracy: Math.max(10, Math.round(summary.accuracyPerc) - index),
      level: Math.max(1, 10 - index)
    }));
    baseEntries.unshift({
      name: userName.trim() || 'Você',
      streak: Math.max(1, summary.bestStreak || summary.currentStreak || 1),
      cpm: Math.max(0, Math.round(summary.cps * 60)),
      accuracy: Math.max(0, Math.round(summary.accuracyPerc)),
      level: Math.max(1, Math.round(summary.totalPhrases / 10) || 1)
    });
    return baseEntries.slice(0, 10);
  }

  function renderRanking(summary) {
    rankingNav.innerHTML = '';
    rankingContent.innerHTML = '';
    const entries = buildSampleRanking(summary);
    rankingTabs.forEach((tab) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `stats-ranking__tab${tab.key === activeRankingKey ? ' is-active' : ''}`;
      button.textContent = tab.label;
      button.addEventListener('click', () => {
        activeRankingKey = tab.key;
        renderRanking(summary);
      });
      rankingNav.appendChild(button);
    });
    const list = document.createElement('ul');
    list.className = 'stats-ranking__list';
    const formatter = {
      streak: (entry) => `${formatInteger(entry.streak)}x`,
      cpm: (entry) => `${formatInteger(entry.cpm)} cpm`,
      accuracy: (entry) => `${formatInteger(entry.accuracy)}%`,
      level: (entry) => `Nível ${formatInteger(entry.level)}`
    }[activeRankingKey];
    entries.forEach((entry, index) => {
      const row = document.createElement('li');
      row.className = 'ranking-row stats-ranking__row';
      const position = document.createElement('span');
      position.className = 'ranking-row__position';
      position.textContent = index + 1;
      const info = document.createElement('div');
      info.className = 'ranking-row__info';
      const name = document.createElement('strong');
      name.className = 'ranking-row__name';
      name.textContent = entry.name;
      const meta = document.createElement('span');
      meta.className = 'ranking-row__meta';
      meta.textContent = formatter(entry);
      info.append(name, meta);
      row.append(position, info);
      list.appendChild(row);
    });
    rankingContent.appendChild(list);
    if (window.playtalkLens) {
      window.playtalkLens.applyLens(rankingsSection, { mode: activeMode, color: getLensColor(activeMode) });
    }
  }

  function render(mode) {
    container.style.opacity = 0;
    setTimeout(() => {
      const summary = getSummaryFor(mode);
      renderHero();
      renderMedals(summary);
      renderNumbers(summary);
      renderRanking(summary);
      if (window.playtalkLens) {
        window.playtalkLens.applyLens(container, { mode, color: getLensColor(mode) });
      }
      container.style.opacity = 1;
    }, 150);
  }

  function selectMode(mode) {
    buttons.forEach(img => {
      img.style.opacity = img.dataset.mode == mode ? '1' : '0.3';
    });
    activeMode = mode;
    render(mode);
  }

  buttons.forEach(img => {
    img.addEventListener('click', () => {
      clickSound.currentTime = 0;
      clickSound.play();
      selectMode(parseInt(img.dataset.mode, 10));
    });
  });

  selectMode(1);

  const seq = localStorage.getItem('statsSequence');
  if (seq === 'true') {
    localStorage.removeItem('statsSequence');
    let delay = 3000;
    [2, 3, 4, 5, 6].forEach(mode => {
      setTimeout(() => selectMode(mode), delay);
      delay += 1500;
    });
  }

  document.addEventListener('playtalk:user-change', () => {
    refreshStatsData();
    selectMode(activeMode);
  });
}

if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
  window.registerPlaytalkPage('page-play', initPlayPage);
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initPlayPage(), { once: true });
} else {
  initPlayPage();
}
