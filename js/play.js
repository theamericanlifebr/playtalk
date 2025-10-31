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

const MODE_THRESHOLDS = {
  1: 25000,
  2: 25000,
  3: 25000,
  4: 25000,
  5: 25000,
  6: 25115
};

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

function createStatBar(perc, label, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stat-bar';
  const safePerc = Number.isFinite(perc) ? perc : 0;
  const clamped = Math.max(0, Math.min(safePerc, 100));
  const rounded = Math.round(clamped);
  const title = document.createElement('div');
  title.className = 'stat-bar-label';
  const valueText = options && typeof options.valueText === 'string'
    ? options.valueText
    : null;
  const suffix = options && typeof options.suffix === 'string'
    ? options.suffix
    : '%';
  title.textContent = valueText !== null
    ? `${label} ${valueText}`
    : `${label} ${rounded}${suffix}`;
  const track = document.createElement('div');
  track.className = 'stat-bar-track';
  const fill = document.createElement('div');
  fill.className = 'stat-bar-fill';
  fill.style.backgroundColor = colorFromPercent(clamped);
  fill.style.width = '0%';
  track.appendChild(fill);
  wrapper.appendChild(title);
  wrapper.appendChild(track);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.width = `${clamped}%`;
    });
  });
  return wrapper;
}

function initPlayPage(context = {}) {
  const scope = context && context.container ? context.container : document;
  const container = scope.querySelector('#play-content');
  if (!container) {
    return;
  }
  container.classList.add('stats-wrapper');
  container.style.transition = 'opacity 0.2s';
  const buttons = scope.querySelectorAll('#mode-buttons img');
  const clickSound = new Audio('gamesounds/mododesbloqueado.mp3');
  let statsData = {};
  let activeMode = 1;
  function refreshStatsData() {
    statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');
  }
  refreshStatsData();
  const timeGoals = {1:1.8, 2:2.2, 3:2.2, 4:3.0, 5:3.5, 6:2.0};
  const MAX_TIME = 6.0;

  function calcModeStats(mode) {
    const stats = statsData[mode] || {};
    const total = stats.totalPhrases || 0;
    const correct = stats.correct || 0;
    const totalTime = stats.totalTime || 0;
    const points = stats.points || 0;
    const accPerc = total ? (correct / total * 100) : 0;
    const avg = total ? (totalTime / total / 1000) : 0;
    const goal = timeGoals[mode] || MAX_TIME;
    let timePerc = total ? ((MAX_TIME - avg) / (MAX_TIME - goal) * 100) : 0;
    if (avg >= MAX_TIME) timePerc = 0;
    if ([2, 3, 6].includes(mode) && total) timePerc += 20;
    return { accPerc, timePerc, avg, points };
  }

  function render(mode) {
    container.style.opacity = 0;
    setTimeout(() => {
      container.innerHTML = '';
      const targetMode = Number.isFinite(mode) ? mode : 1;
      const { accPerc, timePerc, points } = calcModeStats(targetMode);
      const displayTime = targetMode === 5 ? timePerc * 1.75 : timePerc;
      const threshold = MODE_THRESHOLDS[targetMode] || 25000;
      const safePoints = Math.max(0, Math.floor(points || 0));
      const pointsPerc = threshold > 0 ? (safePoints / threshold) * 100 : 0;
      const formattedPoints = `${safePoints.toLocaleString('pt-BR')} pts`;
      container.appendChild(createStatBar(displayTime, 'Tempo'));
      container.appendChild(createStatBar(accPerc, 'Precisão'));
      container.appendChild(createStatBar(pointsPerc, 'Pontos', { valueText: formattedPoints }));
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
