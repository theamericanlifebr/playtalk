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
  const buttons = document.querySelectorAll('#mode-buttons img');
  const clickSound = new Audio('gamesounds/mododesbloqueado.mp3');
  const statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');

  const params = new URLSearchParams(window.location.search);
  const botName = params.get('bot');
  const botMode = parseInt(params.get('mode'), 10);

  if (botName) {
    document.getElementById('mode-buttons').style.display = 'none';
    container.style.display = 'none';
    startVersus(botName, botMode);
    return;
  }
  function calcModeStats(mode) {
    const stats = statsData[mode] || {};
    const total = stats.totalPhrases || 0;
    const correct = stats.correct || 0;
    const report = stats.report || 0;
    const totalTime = stats.totalTime || 0;
    const timePts = stats.timePoints || 0;
    const accPerc = total ? (correct / total * 100) : 0;
    const avg = total ? (totalTime / total / 1000) : 0;
    const timePerc = total ? (timePts / total) : 0;
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

  function startVersus(name, mode) {
    fetch('users/bots.json')
      .then(r => r.json())
      .then(data => {
        const bot = data.bots.find(b => b.name === name);
        if (!bot) return;
        const base = bot.modes[String(mode)] || { precisao: 0, tempo: 0 };
        const vs = document.getElementById('versus-stats');
        const title = document.getElementById('vs-title');
        const roundEl = document.getElementById('round');
        const userAcc = document.getElementById('user-acc');
        const userTime = document.getElementById('user-time');
        const botAcc = document.getElementById('bot-acc');
        const botTime = document.getElementById('bot-time');
        vs.style.display = 'block';
        title.textContent = `${bot.name} - Modo ${mode}`;
        let round = 1;
        const totalRounds = 5;
        function nextRound() {
          roundEl.textContent = `Frase ${round}`;
          userAcc.textContent = 'Você precisão: 0%';
          userTime.textContent = 'Você tempo: 0s';
          botAcc.textContent = 'Bot precisão: 0%';
          botTime.textContent = 'Bot tempo: 0s';
          setTimeout(() => {
            const vary = v => v * (1 + (Math.random() * 0.14 - 0.07));
            const bAcc = vary(base.precisao);
            const bTime = vary(base.tempo);
            botAcc.textContent = `Bot precisão: ${bAcc.toFixed(1)}%`;
            botTime.textContent = `Bot tempo: ${bTime.toFixed(1)}s`;
            const uAcc = vary(base.precisao);
            const uTime = vary(base.tempo);
            userAcc.textContent = `Você precisão: ${uAcc.toFixed(1)}%`;
            userTime.textContent = `Você tempo: ${uTime.toFixed(1)}s`;
            round++;
            if (round <= totalRounds) {
              setTimeout(nextRound, 1000);
            }
          }, 1000);
        }
        nextRound();
      });
  }

  function render(mode) {
    container.innerHTML = '';
    if (mode === 1) {
      const { accPerc, timePerc, notReportPerc } = calcGeneralStats();
      container.appendChild(createStatCircle(accPerc, 'Precisão', 'selos%20modos%20de%20jogo/precisao.png'));
      container.appendChild(createStatCircle(timePerc, 'Tempo', 'selos%20modos%20de%20jogo/velocidade.png'));
      container.appendChild(createStatCircle(notReportPerc, 'Report', 'selos%20modos%20de%20jogo/reports.png'));
    } else {
      const { accPerc, timePerc, notReportPerc } = calcModeStats(mode);
      container.appendChild(createStatCircle(accPerc, 'Precisão', 'selos%20modos%20de%20jogo/precisao.png'));
      container.appendChild(createStatCircle(timePerc, 'Tempo', 'selos%20modos%20de%20jogo/velocidade.png'));
      container.appendChild(createStatCircle(notReportPerc, 'Report', 'selos%20modos%20de%20jogo/reports.png'));
    }
  }

  function selectMode(mode) {
    buttons.forEach(img => {
      img.style.opacity = img.dataset.mode == mode ? '1' : '0.5';
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
  }
});
