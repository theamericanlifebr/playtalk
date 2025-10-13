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

function createStatCircle(perc, label, iconSrc, extraText) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stat-circle';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('class', 'circle-bg');
  bg.setAttribute('cx', '60');
  bg.setAttribute('cy', '60');
  bg.setAttribute('r', radius);
  svg.appendChild(bg);
  const prog = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  prog.setAttribute('class', 'circle-progress');
  prog.setAttribute('cx', '60');
  prog.setAttribute('cy', '60');
  prog.setAttribute('r', radius);
  prog.setAttribute('stroke-dasharray', circumference);
  const clamped = Math.max(0, Math.min(perc, 100));
  prog.setAttribute('stroke-dashoffset', circumference);
  prog.style.stroke = colorFromPercent(perc);
  svg.appendChild(prog);
  wrapper.appendChild(svg);
  const icon = document.createElement('img');
  icon.className = 'circle-icon';
  icon.src = iconSrc;
  icon.alt = label;
  wrapper.appendChild(icon);
  setTimeout(() => {
    prog.setAttribute('stroke-dashoffset', circumference * (1 - clamped / 100));
  }, 50);
  const value = document.createElement('div');
  value.className = 'circle-value';
  value.textContent = `${Math.round(perc)}%`;
  wrapper.appendChild(value);
  const labelEl = document.createElement('div');
  labelEl.className = 'circle-label';
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);
  if (extraText) {
    const extra = document.createElement('div');
    extra.className = 'circle-extra';
    extra.textContent = extraText;
    wrapper.appendChild(extra);
  }
  return wrapper;
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('play-content');
  container.style.transition = 'opacity 0.2s';
  const buttons = document.querySelectorAll('#mode-buttons img');
  const clickSound = new Audio('gamesounds/mododesbloqueado.mp3');
  const statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');
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
      if (mode === 1) {
        const { accPerc, timePerc, notReportPerc } = calcGeneralStats();
        container.appendChild(createStatCircle(accPerc, 'Precisão', 'selos%20modos%20de%20jogo/precisao.png'));
        container.appendChild(createStatCircle(timePerc, 'Tempo', 'selos%20modos%20de%20jogo/velocidade.png'));
        container.appendChild(createStatCircle(notReportPerc, 'Report', 'selos%20modos%20de%20jogo/reports.png'));
      } else {
        const { accPerc, timePerc, notReportPerc } = calcModeStats(mode);
        const displayTime = mode === 5 ? timePerc * 1.75 : timePerc;
        container.appendChild(createStatCircle(accPerc, 'Precisão', 'selos%20modos%20de%20jogo/precisao.png'));
        container.appendChild(createStatCircle(displayTime, 'Tempo', 'selos%20modos%20de%20jogo/velocidade.png'));
        container.appendChild(createStatCircle(notReportPerc, 'Report', 'selos%20modos%20de%20jogo/reports.png'));
      }
      container.style.opacity = 1;
    }, 150);
  }

  function selectMode(mode) {
    buttons.forEach(img => {
      img.style.opacity = img.dataset.mode == mode ? '1' : '0.3';
    });
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
});
