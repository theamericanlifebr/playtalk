(function() {
  const auraAPI = window.playtalkAura || {
    compute: () => ({ segments: [], score: 0, total: 0 }),
    gradientFromSegments: () => ''
  };
  const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%239fb8ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%236283ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.9%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';
  const ROTATION_INTERVAL = 6000;

  let listElement = null;
  let statusElement = null;
  let titleElement = null;
  let descriptionElement = null;
  let indicatorContainer = null;
  let controlButtons = null;
  let rankingsPayload = [];
  let currentRankingIndex = 0;
  let rotationTimer = null;

  function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function aggregateModeStats(modeStats = {}) {
    const stats = { totalCorrect: 0, totalAttempts: 0, totalTime: 0, totalCorrectChars: 0 };
    Object.values(modeStats).forEach(entry => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const correct = Number(entry.correct) || 0;
      const wrong = Number(entry.wrong) || 0;
      const totalPhrases = Number(entry.totalPhrases) || 0;
      const totalChars = Number(entry.totalChars) || 0;
      const correctChars = Number(entry.correctChars) || 0;
      const totalTime = Number(entry.totalTime) || 0;
      stats.totalCorrect += correct;
      stats.totalAttempts += correct + wrong || totalPhrases;
      stats.totalCorrectChars += correctChars;
      stats.totalTime += totalTime;
      if (!stats.totalAttempts && totalPhrases) {
        stats.totalAttempts += totalPhrases;
      }
      if (!stats.totalCorrectChars && totalChars) {
        stats.totalCorrectChars += totalChars;
      }
    });
    const minutes = stats.totalTime > 0 ? stats.totalTime / 60000 : 0;
    const cpm = minutes > 0 ? stats.totalCorrectChars / minutes : 0;
    return { ...stats, cpm };
  }

  function normalizePlayers(databaseUsers) {
    if (!Array.isArray(databaseUsers)) {
      return [];
    }
    const monthKey = getCurrentMonthKey();
    return databaseUsers
      .map(entry => {
        if (!entry || !entry.data || !entry.data.shareResults) {
          return null;
        }
        const data = entry.data;
        const displayName = (data.displayName && data.displayName.trim()) || entry.username || 'Jogador';
        const avatar = (typeof data.avatar === 'string' && data.avatar.trim()) || DEFAULT_AVATAR;
        const generalLevel = data.generalProgress && Number.isFinite(data.generalProgress.level)
          ? Math.max(1, Math.floor(data.generalProgress.level))
          : 0;
        const pastaLevel = Number(data.pastaAtual) || 0;
        const level = Math.max(1, generalLevel || pastaLevel || 1);
        const aggregated = aggregateModeStats(data.modeStats || {});
        const medalHistory = Array.isArray(data.medalHistory) ? data.medalHistory : [];
        const auraData = auraAPI.compute(medalHistory);
        const auraGradient = auraData.total >= 10 ? auraAPI.gradientFromSegments(auraData.segments) : '';
        const monthlyEntry = data.monthlyPerformance && data.monthlyPerformance[monthKey];
        const monthlyAccuracy = monthlyEntry && Number(monthlyEntry.attempts) > 0
          ? (Number(monthlyEntry.correct) / Number(monthlyEntry.attempts)) * 100
          : 0;
        const points = Number(data.points) || 0;
        const bestStreak = Number(data.bestStreak) || 0;
        return {
          name: displayName,
          avatar,
          level,
          points,
          speed: aggregated.cpm,
          auraScore: auraData.total >= 10 ? auraData.score : 0,
          auraGradient,
          auraSegments: auraData.segments,
          auraMedals: auraData.total,
          monthlyAccuracy,
          bestStreak,
          isPlaceholder: false
        };
      })
      .filter(Boolean);
  }

  const RANKING_DEFINITIONS = [
    {
      id: 'level',
      title: 'Ranking de nível',
      description: 'Jogadores que avançaram mais no progresso geral.',
      placeholderValue: 'Nível 0',
      formatValue: player => `Nível ${player.level}`,
      selector: players => players.slice().sort((a, b) => b.level - a.level)
    },
    {
      id: 'speed',
      title: 'Os mais rápidos',
      description: 'Maior média de caracteres corretos por minuto.',
      placeholderValue: '0 CPM',
      formatValue: player => `${Math.max(0, Math.round(player.speed || 0)).toLocaleString('pt-BR')} CPM`,
      selector: players => players.slice().sort((a, b) => (b.speed || 0) - (a.speed || 0))
    },
    {
      id: 'points',
      title: 'Mais pontos',
      description: 'Pontuação acumulada em todos os modos.',
      placeholderValue: '0 pts',
      formatValue: player => `${Math.max(0, Math.round(player.points || 0)).toLocaleString('pt-BR')} pts`,
      selector: players => players.slice().sort((a, b) => (b.points || 0) - (a.points || 0))
    },
    {
      id: 'aura',
      title: 'Aura Score',
      description: 'Quem mantém a melhor proporção entre as medalhas mais comuns.',
      placeholderValue: 'Aura 0',
      formatValue: player => player.auraMedals >= 10 ? `${player.auraScore.toFixed(2)}` : 'Aura 0',
      selector: players => players
        .filter(player => player.auraMedals >= 10)
        .sort((a, b) => b.auraScore - a.auraScore)
    },
    {
      id: 'month',
      title: 'Os melhores do mês',
      description: 'Maior precisão geral nos modos 3, 4, 5 e 6. Reinicia todo dia 1.',
      placeholderValue: '0%',
      formatValue: player => `${Math.max(0, Math.min(player.monthlyAccuracy || 0, 100)).toFixed(1)}%`,
      selector: players => players.slice().sort((a, b) => (b.monthlyAccuracy || 0) - (a.monthlyAccuracy || 0))
    },
    {
      id: 'streak',
      title: 'Acertos sequenciais',
      description: 'Maiores sequências de frases certas sem errar.',
      placeholderValue: '0 sequência',
      formatValue: player => `${Math.max(0, Math.round(player.bestStreak || 0)).toLocaleString('pt-BR')} sequência${player.bestStreak === 1 ? '' : 's'}`,
      selector: players => players.slice().sort((a, b) => (b.bestStreak || 0) - (a.bestStreak || 0))
    }
  ];

  function createPlaceholderEntry(valueText) {
    return {
      name: 'Vazio',
      avatar: DEFAULT_AVATAR,
      level: 0,
      points: 0,
      speed: 0,
      auraScore: 0,
      auraGradient: '',
      auraSegments: [],
      auraMedals: 0,
      monthlyAccuracy: 0,
      bestStreak: 0,
      displayValue: valueText,
      isPlaceholder: true
    };
  }

  function prepareRankingEntries(players, definition) {
    const selected = definition.selector(players) || [];
    const withValues = selected.map(player => ({
      ...player,
      displayValue: definition.formatValue(player)
    }));
    while (withValues.length < 20) {
      withValues.push(createPlaceholderEntry(definition.placeholderValue));
    }
    return withValues.slice(0, 20);
  }

  function buildEntry(entry, index) {
    const item = document.createElement('li');
    item.className = 'ranking-entry';

    const position = document.createElement('span');
    position.className = 'ranking-entry__position';
    position.textContent = `${index + 1}º`;
    item.appendChild(position);

    const player = document.createElement('div');
    player.className = 'ranking-entry__player';

    const ring = document.createElement('span');
    ring.className = 'aura-ring';
    if (entry.auraGradient) {
      ring.style.setProperty('--aura-gradient', entry.auraGradient);
    }
    const inner = document.createElement('span');
    inner.className = 'aura-ring__inner';
    const avatar = document.createElement('img');
    avatar.className = 'ranking-entry__avatar';
    avatar.src = entry.avatar || DEFAULT_AVATAR;
    avatar.alt = `Avatar de ${entry.name}`;
    inner.appendChild(avatar);
    ring.appendChild(inner);
    player.appendChild(ring);

    const names = document.createElement('div');
    names.className = 'ranking-entry__names';

    const name = document.createElement('p');
    name.className = 'ranking-entry__name';
    name.textContent = entry.name;
    names.appendChild(name);

    const meta = document.createElement('p');
    meta.className = 'ranking-entry__meta';
    meta.textContent = entry.isPlaceholder ? 'Nível 0' : `Nível ${entry.level}`;
    names.appendChild(meta);

    player.appendChild(names);
    item.appendChild(player);

    const value = document.createElement('div');
    value.className = 'ranking-entry__value';
    value.textContent = entry.displayValue;
    item.appendChild(value);
    return item;
  }

  function renderRanking(entries) {
    if (!listElement) {
      return;
    }
    listElement.innerHTML = '';
    entries.forEach((entry, index) => {
      listElement.appendChild(buildEntry(entry, index));
    });
  }

  function updateIndicators() {
    if (!indicatorContainer) {
      return;
    }
    indicatorContainer.innerHTML = '';
    rankingsPayload.forEach((ranking, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', ranking.title);
      if (index === currentRankingIndex) {
        button.setAttribute('aria-current', 'true');
      }
      button.addEventListener('click', () => {
        showRanking(index);
        restartRotation();
      });
      indicatorContainer.appendChild(button);
    });
  }

  function showRanking(index = 0) {
    if (!rankingsPayload.length) {
      return;
    }
    currentRankingIndex = (index + rankingsPayload.length) % rankingsPayload.length;
    const ranking = rankingsPayload[currentRankingIndex];
    if (titleElement) {
      titleElement.textContent = ranking.title;
    }
    if (descriptionElement) {
      descriptionElement.textContent = ranking.description;
    }
    renderRanking(ranking.entries);
    updateIndicators();
  }

  function restartRotation() {
    if (rotationTimer) {
      clearInterval(rotationTimer);
    }
    rotationTimer = setInterval(() => {
      showRanking(currentRankingIndex + 1);
    }, ROTATION_INTERVAL);
  }

  async function fetchPlayers() {
    const response = await fetch('/api/users', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Falha ao carregar usuários (${response.status})`);
    }
    const payload = await response.json();
    const values = payload && payload.users ? Object.values(payload.users) : [];
    return normalizePlayers(values);
  }

  function assignElements() {
    listElement = document.getElementById('ranking-list');
    statusElement = document.getElementById('ranking-status');
    titleElement = document.getElementById('ranking-title');
    descriptionElement = document.getElementById('ranking-description');
    indicatorContainer = document.getElementById('ranking-indicators');
    controlButtons = document.querySelectorAll('.ranking-rotator__control');
  }

  function bindControls() {
    if (!controlButtons || !controlButtons.length) {
      return;
    }
    controlButtons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'next') {
          showRanking(currentRankingIndex + 1);
        } else {
          showRanking(currentRankingIndex - 1);
        }
        restartRotation();
      });
    });
  }

  function showStatus(message, isError = false) {
    if (!statusElement) {
      return;
    }
    statusElement.hidden = !message;
    statusElement.textContent = message;
    statusElement.classList.toggle('ranking-status--error', Boolean(isError));
  }

  async function loadRankings() {
    try {
      showStatus('Carregando ranking...');
      const players = await fetchPlayers();
      rankingsPayload = RANKING_DEFINITIONS.map(definition => ({
        ...definition,
        entries: prepareRankingEntries(players, definition)
      }));
      if (!rankingsPayload.length) {
        showStatus('Nenhum jogador disponível no momento.');
        return;
      }
      showStatus('');
      showRanking(0);
      restartRotation();
    } catch (error) {
      console.error('Erro ao carregar ranking', error);
      showStatus('Não foi possível carregar o ranking agora. Tente novamente mais tarde.', true);
    }
  }

  function init() {
    assignElements();
    bindControls();
    loadRankings();
  }

  if (window && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-ranking', init);
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
      init();
    }
  }
})();
