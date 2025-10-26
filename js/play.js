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

const STAT_ICONS = {
  Progresso: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 9.62 9.1H3.5l5 3.64-1.9 6.76L12 15.9l5.4 3.6-1.9-6.76 5-3.64h-6.12Z"/></svg>',
  Tempo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 11h4a1 1 0 0 1 0 2h-5a1 1 0 0 1-1-1V7a1 1 0 1 1 2 0Z"/></svg>',
  Precisão: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 1 1 0 0 0-2 0 8 8 0 1 1-8-8 1 1 0 0 0 0-2Zm0 4a6 6 0 1 0 6 6 1 1 0 0 0-2 0 4 4 0 1 1-4-4 1 1 0 0 0 0-2Zm0 4a2 2 0 1 0 2 2 1 1 0 0 0-2 0 0 0 0 0 0 0Z"/></svg>',
  Report: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5.55 3.84 10.74 8 11.95 4.16-1.21 8-6.4 8-11.95V5Zm0 18.17C8.84 18.74 6 14.63 6 11V6.46l6-2.14 6 2.14V11c0 3.63-2.84 7.74-6 9.17Zm0-13.17a3 3 0 0 0-3 3v2a3 3 0 0 0 6 0v-2a3 3 0 0 0-3-3Zm1 5a1 1 0 0 1-2 0v-2a1 1 0 0 1 2 0Z"/></svg>'
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function createStatCircle(perc, label, { variant = 'secondary' } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stat-circle';
  if (variant === 'primary') {
    wrapper.classList.add('stat-circle--primary');
  }
  const safePerc = Number.isFinite(perc) ? perc : 0;
  const clamped = Math.max(0, Math.min(safePerc, 100));
  const circumference = 2 * Math.PI * 52;

  const ring = document.createElement('div');
  ring.className = 'stat-circle__ring';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('class', 'stat-circle__svg');

  const track = document.createElementNS(SVG_NS, 'circle');
  track.setAttribute('class', 'stat-circle__track');
  track.setAttribute('cx', '60');
  track.setAttribute('cy', '60');
  track.setAttribute('r', '52');
  svg.appendChild(track);

  const progress = document.createElementNS(SVG_NS, 'circle');
  progress.setAttribute('class', 'stat-circle__progress');
  progress.setAttribute('cx', '60');
  progress.setAttribute('cy', '60');
  progress.setAttribute('r', '52');
  progress.style.strokeDasharray = circumference.toFixed(2);
  progress.style.strokeDashoffset = circumference.toFixed(2);
  progress.style.stroke = colorFromPercent(clamped);
  svg.appendChild(progress);

  ring.appendChild(svg);

  const inner = document.createElement('div');
  inner.className = 'stat-circle__inner';
  const icon = document.createElement('span');
  icon.className = 'stat-circle__icon';
  icon.innerHTML = STAT_ICONS[label] || STAT_ICONS.Progresso;
  inner.appendChild(icon);
  ring.appendChild(inner);

  wrapper.appendChild(ring);

  const labelEl = document.createElement('span');
  labelEl.className = 'stat-circle__label';
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', `${label} ${Math.round(clamped)}%`);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const offset = (1 - clamped / 100) * circumference;
      progress.style.strokeDashoffset = offset.toFixed(2);
      progress.style.stroke = colorFromPercent(clamped);
    });
  });

  return wrapper;
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('play-content');
  container.classList.add('stats-wrapper');
  container.style.transition = 'opacity 0.2s';
  const buttons = document.querySelectorAll('#mode-buttons img');
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
    const report = stats.report || 0;
    const totalTime = stats.totalTime || 0;
    const accPerc = total ? (correct / total * 100) : 0;
    const avg = total ? (totalTime / total / 1000) : 0;
    const goal = timeGoals[mode] || MAX_TIME;
    let timePerc = total ? ((MAX_TIME - avg) / (MAX_TIME - goal) * 100) : 0;
    if (avg >= MAX_TIME) timePerc = 0;
    if ([2, 3, 6].includes(mode) && total) timePerc += 20;
    const notReportPerc = total ? (100 - (report / total * 100)) : 100;
    return { accPerc, timePerc, avg, notReportPerc };
  }

  function calcGeneralStats() {
    const modes = [2, 3, 4, 5, 6];
    let totalPhrases = 0, totalCorrect = 0, totalTime = 0, totalReport = 0;
    let timePercSum = 0, timePercCount = 0;
    modes.forEach(m => {
      const s = statsData[m] || {};
      totalPhrases += s.totalPhrases || 0;
      totalCorrect += s.correct || 0;
      totalTime += s.totalTime || 0;
      totalReport += s.report || 0;
      const tp = calcModeStats(m).timePerc;
      if (tp >= 1) {
        timePercSum += tp;
        timePercCount++;
      }
    });
    const accPerc = totalPhrases ? (totalCorrect / totalPhrases * 100) : 0;
    const avg = totalPhrases ? (totalTime / totalPhrases / 1000) : 0;
    const timePerc = timePercCount ? (timePercSum / timePercCount) : 0;
    const notReportPerc = totalPhrases ? (100 - (totalReport / totalPhrases * 100)) : 100;
    return { accPerc, timePerc, avg, notReportPerc };
  }

  function render(mode) {
    container.style.opacity = 0;
    setTimeout(() => {
      container.innerHTML = '';
      const { accPerc, timePerc, notReportPerc } = mode === 1 ? calcGeneralStats() : calcModeStats(mode);
      const displayTimeRaw = mode === 5 ? timePerc * 1.75 : timePerc;
      const displayTime = Math.max(0, Math.min(displayTimeRaw, 100));
      const overall = Math.max(0, Math.min((displayTime + accPerc + notReportPerc) / 3, 100));

      const primaryGroup = document.createElement('div');
      primaryGroup.className = 'stats-wrapper__primary';
      primaryGroup.appendChild(createStatCircle(overall, 'Progresso', { variant: 'primary' }));
      container.appendChild(primaryGroup);

      const grid = document.createElement('div');
      grid.className = 'stat-circle-grid';
      grid.appendChild(createStatCircle(displayTime, 'Tempo'));
      grid.appendChild(createStatCircle(accPerc, 'Precisão'));
      grid.appendChild(createStatCircle(notReportPerc, 'Report'));
      container.appendChild(grid);
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
});
