// Versus mode logic

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

async function carregarPastas() {
  const resp = await fetch('data/pastasversus.json');
  const data = await resp.json();
  return data.frases.map(l => l.split('#').map(s => s.trim()));
}

document.addEventListener('DOMContentLoaded', () => {
  fetch('users/bots.json')
    .then(r => r.json())
    .then(data => {
      const list = document.getElementById('bot-list');
      data.bots.forEach(bot => {
        const div = document.createElement('div');
        div.className = 'bot-item';
        div.innerHTML = `<img src="users/${bot.file}" alt="${bot.name}"><div>${bot.name}</div>`;
        div.addEventListener('click', () => {
          const img = div.querySelector('img');
          if (img) img.style.opacity = '1';
          showModes(bot);
        });
        list.appendChild(div);
      });
    });

  let frases = [];
  let fraseIndex = 0;
  let esperado = '';
  let inicioFrase = 0;
  let totalTempo = 0;
  let totalFrases = 0;
  let acertos = 0;
  let botStats = { precisao: 0, tempo: 0 };
  let botAtual = null;
  let userTimePerc = 0;
  let userAccPerc = 0;
  let botTimePerc = 0;
  let botAccPerc = 0;
  let progressTimer = null;
  let reconhecimento = null;
  let modoAtual = 0;
  let gameStart = 0;
  let versusLog = JSON.parse(localStorage.getItem('versusLog') || '[]');

  const fraseEl = document.getElementById('versus-phrase');
  const userImg = document.querySelector('#player-user .player-img');
  const botImg = document.getElementById('bot-avatar');

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    reconhecimento = new SpeechRecognition();
    reconhecimento.lang = 'en-US';
    reconhecimento.continuous = true;
    reconhecimento.interimResults = false;
    reconhecimento.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
      verificar(transcript);
    };
    reconhecimento.onerror = (e) => console.error('Erro no reconhecimento de voz:', e.error);
    reconhecimento.onend = () => {
      if (modoAtual) try { reconhecimento.start(); } catch (err) {}
    };
  } else {
    alert('Reconhecimento de voz não suportado.');
  }

  function showModes(bot) {
    document.getElementById('bot-list').style.display = 'none';
    const modeList = document.getElementById('mode-list');
    modeList.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
      const img = document.createElement('img');
      img.src = `selos%20modos%20de%20jogo/modo${i}.png`;
      img.alt = `Modo ${i}`;
      img.dataset.mode = i;
      img.addEventListener('click', () => {
        img.style.opacity = '1';
        startVersus(bot, i);
      });
      modeList.appendChild(img);
    }
    modeList.style.display = 'grid';
  }

  async function startVersus(bot, modo) {
    botAtual = bot;
    modoAtual = modo;
    document.getElementById('mode-list').style.display = 'none';
    const game = document.getElementById('versus-game');
    document.getElementById('bot-name').textContent = bot.name;
    botImg.src = `users/${bot.file}`;
    const imgs = document.querySelectorAll('.player-img');
    const bars = document.querySelectorAll('.stat-bar');
    if (modo === 2) {
      imgs.forEach(img => {
        img.style.width = '120px';
        img.style.height = '120px';
      });
      bars.forEach(bar => bar.style.width = '120px');
    } else {
      imgs.forEach(img => {
        img.style.width = '150px';
        img.style.height = '150px';
      });
      bars.forEach(bar => bar.style.width = '200px');
    }
    game.style.display = 'block';
    frases = embaralhar(await carregarPastas());
    botStats = bot.modes[String(modo)] || { precisao: 0, tempo: 0 };
    gameStart = Date.now();
    nextFrase();
    startProgress();
    updateBars();
    setTimeout(encerrar, 120000);
    if (reconhecimento) try { reconhecimento.start(); } catch (err) {}
  }

  function embaralhar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function balanceText(el) {
    const text = el.textContent.trim();
    const words = text.split(/\s+/);
    const targetLen = Math.ceil(text.length / 3);
    const lines = [];
    let current = '';
    words.forEach(word => {
      const next = current ? current + ' ' + word : word;
      if (next.length <= targetLen || !current) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    el.innerHTML = lines.join('<br>');
  }

  function nextFrase() {
    if (fraseIndex >= frases.length) fraseIndex = 0;
    const [pt, en] = frases[fraseIndex];
    fraseEl.style.transition = 'none';
    fraseEl.style.opacity = 0;
    fraseEl.style.fontSize = '40px';
    fraseEl.style.color = '#fff';
    fraseEl.textContent = pt;
    balanceText(fraseEl);
    esperado = en.toLowerCase();
    if (modoAtual === 5) {
      const utter = new SpeechSynthesisUtterance(en);
      utter.lang = 'en-US';
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    } else {
      fraseEl.style.opacity = 1;
      fraseEl.style.fontSize = '45px';
    }
    inicioFrase = Date.now();
    fraseIndex++;
  }

  function flashColor(cor) {
    fraseEl.style.color = cor;
    setTimeout(() => {
      fraseEl.style.color = '#fff';
    }, 500);
  }

  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[a.length][b.length];
  }

  function fraseCorreta(resp, esperado) {
    const respWords = resp.trim().split(/\s+/);
    const expWords = esperado.trim().split(/\s+/);
    if (respWords.length < expWords.length) return false;
    for (let start = 0; start <= respWords.length - expWords.length; start++) {
      let ok = true;
      for (let i = 0; i < expWords.length; i++) {
        if (levenshtein(respWords[start + i], expWords[i]) > 1) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  }

  function verificar(resp) {
    const recTime = Date.now() - inicioFrase;
    let adjTime = recTime;
    const charCount = esperado.replace(/\s+/g, '').length;
    if (charCount > 6) {
      const discount = (charCount - 6) * 131;
      adjTime = Math.max(0, adjTime - discount);
    }
    const tempo = adjTime * 0.88 * 0.93;
    totalTempo += tempo;
    totalFrases++;
    const correto = fraseCorreta(resp, esperado);
    if (correto) {
      acertos++;
      flashColor('#40e0d0');
    } else {
      flashColor('red');
    }
    const atual = frases[fraseIndex - 1];
    versusLog.push({
      phrase: `${atual[0]}#${atual[1]}`,
      input: resp,
      result: correto ? 'certo' : 'errado',
      recTime,
      gameTime: Date.now() - gameStart
    });
    localStorage.setItem('versusLog', JSON.stringify(versusLog));
    updateBars();
    setTimeout(nextFrase, 1000);
  }

  function setBar(fill, perc) {
    fill.style.width = (perc * 2) + 'px';
    fill.style.backgroundColor = colorFromPercent(perc);
    fill.style.opacity = 1;
  }

  function updateBars() {
    userAccPerc = totalFrases ? (acertos / totalFrases * 100) : 0;
    const avg = totalFrases ? (totalTempo / totalFrases / 1000) : 0;
    userTimePerc = Math.max(0, 100 - avg * 20);
    userTimePerc = Math.min(userTimePerc * 1.07 + 15, 100);
    const vary = v => v * (1 + (Math.random() * 0.25 - 0.15));
    botAccPerc = vary(botStats.precisao);
    botTimePerc = vary(botStats.tempo);
    setBar(document.querySelector('#player-user .time .fill'), userTimePerc);
    setBar(document.querySelector('#player-user .acc .fill'), userAccPerc);
    setBar(document.querySelector('#player-bot .time .fill'), botTimePerc);
    setBar(document.querySelector('#player-bot .acc .fill'), botAccPerc);
  }

  function startProgress() {
    const filled = document.getElementById('barra-preenchida');
    const start = Date.now();
    progressTimer = setInterval(() => {
      const ratio = Math.min((Date.now() - start) / 120000, 1);
      filled.style.width = (ratio * 100) + '%';
      filled.style.backgroundColor = calcularCor(ratio * 25000);
      if (ratio >= 1) clearInterval(progressTimer);
    }, 100);
  }

  function encerrar() {
    fraseEl.style.opacity = 0;
    modoAtual = 0;
    if (reconhecimento) try { reconhecimento.stop(); } catch (err) {}
    const userScore = (userAccPerc + userTimePerc) / 2;
    const botScore = (botAccPerc + botTimePerc) / 2;
    if (userScore > botScore) {
      botImg.style.opacity = '0.5';
    } else if (botScore > userScore) {
      userImg.style.opacity = '0.5';
    } else {
      botImg.style.opacity = userImg.style.opacity = '0.5';
    }
  }
});

