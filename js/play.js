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
  { key: 'bronze', label: 'Bronze', icon: 'medalhas/bronze.png' },
  { key: 'chumbo', label: 'Chumbo', icon: 'medalhas/chumbo.png' },
  { key: 'gesso', label: 'Gesso', icon: 'medalhas/gesso.png' }
];

function getEmptyMedalCounts() {
  return {
    diamante: 0,
    ouro: 0,
    prata: 0,
    bronze: 0,
    chumbo: 0,
    gesso: 0
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

function formatCpm(value) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
  return safe.toLocaleString('pt-BR');
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
  section.appendChild(createMetricCard('Velocidade', `${formatCpm(summary.cpm)} cpm`));
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
  container.classList.add('stats-wrapper', 'stats-layout');
  container.style.transition = 'opacity 0.2s';
  const buttons = scope.querySelectorAll('#mode-buttons img');
  const clickSound = new Audio('gamesounds/mododesbloqueado.mp3');
  let statsData = {};
  let activeMode = 1;

  function createBlock(modifier, titleText) {
    const block = document.createElement('div');
    block.className = `stats-block ${modifier}`;
    const heading = document.createElement('h2');
    heading.className = 'stats-subtitle';
    heading.textContent = titleText;
    block.appendChild(heading);
    const content = document.createElement('div');
    content.className = 'stats-block__content';
    block.appendChild(content);
    return { block, content };
  }

  const titleBlock = document.createElement('div');
  titleBlock.className = 'stats-block stats-block--title';
  const title = document.createElement('h1');
  title.className = 'stats-title';
  title.textContent = 'Estatísticas';
  titleBlock.appendChild(title);

  const performanceBlock = createBlock('stats-block--performance', 'Desempenho');
  const medalsBlock = createBlock('stats-block--medals', 'Quadro de medalhas');
  const modesBlock = createBlock('stats-block--modes', 'Modos de jogo');
  const totalsBlock = createBlock('stats-block--totals', 'Totais');

  const performanceContent = performanceBlock.content;
  const medalsContent = medalsBlock.content;
  const totalsContent = totalsBlock.content;

  modesBlock.content.classList.add('stats-block__content--modes');
  modeButtonsContainer.classList.add('stats-mode-icons');
  modesBlock.content.appendChild(modeButtonsContainer);

  container.innerHTML = '';
  container.appendChild(titleBlock);
  container.appendChild(performanceBlock.block);
  container.appendChild(medalsBlock.block);
  container.appendChild(modesBlock.block);
  container.appendChild(totalsBlock.block);
  function refreshStatsData() {
    statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');
  }
  refreshStatsData();
  function calcModeStats(mode) {
    const stats = statsData[mode] || {};
    const totalPhrases = stats.totalPhrases || 0;
    const correctPhrases = stats.correct || 0;
    const totalTime = stats.totalTime || 0;
    const report = stats.report || 0;
    const totalChars = stats.totalChars || 0;
    const correctChars = stats.correctChars || 0;
    const accuracyPerc = totalPhrases ? (correctPhrases / totalPhrases * 100) : 0;
    const minutes = totalTime > 0 ? (totalTime / 60000) : 0;
    const cpm = minutes > 0 ? (correctChars / minutes) : 0;
    const noReportPerc = totalPhrases ? (100 - (report / totalPhrases * 100)) : 100;
    return {
      totalPhrases,
      correctPhrases,
      totalChars,
      correctChars,
      accuracyPerc,
      cpm,
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
    const minutes = totals.totalTime > 0 ? (totals.totalTime / 60000) : 0;
    const cpm = minutes > 0 ? (totals.correctChars / minutes) : 0;
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
      cpm,
      noReportPerc,
      medals: totals.medals,
      bestStreak,
      currentStreak
    };
  }

  function render(mode) {
    container.style.opacity = 0;
    setTimeout(() => {
      const summary = mode === 1 ? calcGeneralStats() : calcModeStats(mode);
      performanceContent.innerHTML = '';
      performanceContent.appendChild(createMetricsSection(summary));
      medalsContent.innerHTML = '';
      medalsContent.appendChild(createMedalsSection(summary.medals));
      totalsContent.innerHTML = '';
      totalsContent.appendChild(createTotalsSection(summary));
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
