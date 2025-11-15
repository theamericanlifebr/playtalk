(function () {
  const ROTATION_INTERVAL = 6000;
  const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';
  const MEDAL_WEIGHTS = {
    diamante: 12,
    ouro: 8,
    prata: 4,
    bronze: 2,
    chumbo: 1,
    gesso: 0
  };
  const MEDAL_COLORS = {
    diamante: ['#6dd5ff', '#cdefff'],
    ouro: ['#f8c630', '#fbe18b'],
    prata: ['#dfe4ea', '#f7f9fb'],
    bronze: ['#b9855b', '#e1b483'],
    chumbo: ['#6d6f78', '#6d6f78'],
    gesso: ['#b18a6b', '#e9cfb1']
  };

  const numberFormatter = new Intl.NumberFormat('pt-BR');
  const percentFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  const PLACEHOLDER_PLAYER = {
    isPlaceholder: true,
    name: 'Vazio',
    avatar: DEFAULT_AVATAR,
    experience: { level: 0, xp: 0, xpToNext: 0 },
    speed: { cpmAverage: 0, matches: 0 },
    points: { total: 0, favoriteMode: 'geral' },
    monthlyPrecision: { value: 0, matches: 0, trackedModes: ['3', '4', '5', '6'] },
    streaks: { longest: 0, current: 0 },
    aura: { eligible: false, totalMedals: 0, score: 0, slices: [] }
  };

  const RANKING_DEFINITIONS = [
    {
      id: 'level',
      label: 'Ranking 1',
      sort: (a, b) => (b.experience.level - a.experience.level) || (b.experience.xp - a.experience.xp),
      metric: player => ({
        primary: `Nível ${player.experience.level}`,
        secondary: `${formatNumber(player.experience.xp)} / ${formatNumber(player.experience.xpToNext)} XP`
      }),
      meta: player => `${formatNumber(player.points.total)} pontos totais`
    },
    {
      id: 'speed',
      label: 'Ranking 2',
      sort: (a, b) => (b.speed.cpmAverage - a.speed.cpmAverage) || (b.speed.matches - a.speed.matches),
      metric: player => ({
        primary: `${formatNumber(player.speed.cpmAverage)} CPM`,
        secondary: `${player.speed.matches} partidas cronometradas`
      }),
      meta: player => `Melhor nível: ${player.experience.level}`
    },
    {
      id: 'points',
      label: 'Ranking 3',
      sort: (a, b) => (b.points.total - a.points.total) || (b.experience.level - a.experience.level),
      metric: player => ({
        primary: `${formatNumber(player.points.total)} pontos`,
        secondary: `${formatNumber(player.experience.xp)} XP acumulados`
      }),
      meta: player => `Modo favorito: ${player.points.favoriteMode || 'geral'}`
    },
    {
      id: 'aura',
      label: 'Ranking 4',
      filter: player => player.aura.eligible,
      sort: (a, b) => (b.aura.score - a.aura.score) || (b.aura.totalMedals - a.aura.totalMedals),
      metric: player => ({
        primary: `${player.aura.score.toFixed(2)} AuraScore`,
        secondary: describeSlices(player.aura.slices) || 'Necessita 10 medalhas'
      }),
      meta: player => `Total de medalhas: ${player.aura.totalMedals}`
    },
    {
      id: 'monthly',
      label: 'Ranking 5',
      sort: (a, b) => (b.monthlyPrecision.value - a.monthlyPrecision.value) || (b.monthlyPrecision.matches - a.monthlyPrecision.matches),
      metric: player => ({
        primary: percentFormatter.format(player.monthlyPrecision.value),
        secondary: `${player.monthlyPrecision.matches} partidas este mês`
      }),
      meta: player => `Válido para modos: ${player.monthlyPrecision.trackedModes.join(', ')}`
    },
    {
      id: 'streak',
      label: 'Ranking 6',
      sort: (a, b) => (b.streaks.longest - a.streaks.longest) || (b.streaks.current - a.streaks.current),
      metric: player => ({
        primary: `${player.streaks.longest} acertos`,
        secondary: `Sequência atual: ${player.streaks.current}`
      }),
      meta: player => `${formatNumber(player.points.total)} pontos na melhor sequência`
    }
  ];

  let panels = [];
  let indicators = [];
  let statusElement = null;
  let rotationHandle = null;
  let activeIndex = 0;
  let players = [];

  function formatNumber(value) {
    return numberFormatter.format(value || 0);
  }

  function describeSlices(slices = []) {
    if (!slices.length) {
      return '';
    }
    return slices
      .map(slice => `${capitalize(slice.type)} ${percentFormatter.format(slice.proportion)}`)
      .join(' • ');
  }

  function capitalize(value = '') {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function computeAura(medalHistory = []) {
    const recent = medalHistory.slice(-100);
    const counts = new Map();
    recent.forEach(type => {
      const key = type && typeof type === 'string' ? type.toLowerCase() : 'gesso';
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const entries = Array.from(counts.entries())
      .map(([type, count]) => ({ type, count, weight: MEDAL_WEIGHTS[type] ?? 0 }))
      .sort((a, b) => (b.count - a.count) || (b.weight - a.weight))
      .slice(0, 3);

    const totalSelected = entries.reduce((sum, entry) => sum + entry.count, 0);
    const slices = entries.map(entry => ({
      type: entry.type,
      proportion: totalSelected ? entry.count / totalSelected : 0
    }));

    const score = slices.reduce((acc, slice) => {
      const weight = MEDAL_WEIGHTS[slice.type] ?? 0;
      return acc + weight * slice.proportion;
    }, 0);

    return {
      eligible: recent.length >= 10,
      totalMedals: recent.length,
      score,
      slices
    };
  }

  function createAuraGradient(slices = []) {
    if (!slices.length) {
      return '';
    }
    let start = 0;
    const segments = slices.map(slice => {
      const colors = MEDAL_COLORS[slice.type] || ['#ffffff', '#ffffff'];
      const end = start + slice.proportion * 360;
      const segment = `${colors[0]} ${start}deg ${end}deg`;
      start = end;
      return segment;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }

  function enrichPlayer(rawPlayer = {}) {
    const aura = computeAura(rawPlayer.medals || []);
    return {
      ...rawPlayer,
      name: rawPlayer.name || 'Jogador',
      avatar: rawPlayer.avatar || DEFAULT_AVATAR,
      experience: {
        level: rawPlayer.experience?.level || 0,
        xp: rawPlayer.experience?.xp || 0,
        xpToNext: rawPlayer.experience?.xpToNext || rawPlayer.experience?.xp || 0
      },
      speed: {
        cpmAverage: rawPlayer.speed?.cpmAverage || 0,
        matches: rawPlayer.speed?.matches || 0
      },
      points: {
        total: rawPlayer.points?.total || 0,
        favoriteMode: rawPlayer.points?.favoriteMode || 'geral'
      },
      monthlyPrecision: {
        value: rawPlayer.monthlyPrecision?.value || 0,
        matches: rawPlayer.monthlyPrecision?.matches || 0,
        trackedModes: rawPlayer.monthlyPrecision?.trackedModes || ['3', '4', '5', '6']
      },
      streaks: {
        longest: rawPlayer.streaks?.longest || rawPlayer.sequentialHits || 0,
        current: rawPlayer.streaks?.current || 0
      },
      aura
    };
  }

  function buildPlaceholder() {
    return JSON.parse(JSON.stringify(PLACEHOLDER_PLAYER));
  }

  function prepareRanking(config) {
    const base = players
      .filter(player => (typeof config.filter === 'function' ? config.filter(player) : true))
      .sort(config.sort)
      .slice(0, 20);

    while (base.length < 20) {
      base.push(buildPlaceholder());
    }
    return base;
  }

  function createEntry(player, position, config) {
    const entry = document.createElement('li');
    entry.className = 'ranking-entry';
    if (!player.isPlaceholder && position <= 3) {
      entry.classList.add('ranking-entry--top');
    }
    if (player.isPlaceholder) {
      entry.classList.add('ranking-entry--placeholder');
    }

    const positionElement = document.createElement('span');
    positionElement.className = 'ranking-entry__position';
    positionElement.textContent = `${position}º`;

    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'ranking-entry__avatar';

    const avatarShell = document.createElement('span');
    avatarShell.className = 'ranking-avatar-shell';

    const auraGradient = player.aura?.eligible ? createAuraGradient(player.aura.slices) : '';
    if (auraGradient) {
      avatarShell.style.setProperty('--aura-ring', auraGradient);
    }

    const avatar = document.createElement('img');
    avatar.src = player.avatar || DEFAULT_AVATAR;
    avatar.alt = player.isPlaceholder ? 'Avatar padrão' : `Foto de ${player.name}`;
    avatar.loading = 'lazy';
    avatar.decoding = 'async';

    avatarShell.appendChild(avatar);
    avatarContainer.appendChild(avatarShell);

    const info = document.createElement('div');
    info.className = 'ranking-entry__info';

    const name = document.createElement('p');
    name.className = 'ranking-entry__name';
    name.textContent = player.name;

    const level = document.createElement('p');
    level.className = 'ranking-entry__level';
    level.textContent = `Nível ${player.experience?.level ?? 0}`;

    const meta = document.createElement('p');
    meta.className = 'ranking-entry__meta';
    meta.textContent = typeof config.meta === 'function' ? config.meta(player) : '';

    info.appendChild(name);
    info.appendChild(level);
    if (meta.textContent) {
      info.appendChild(meta);
    }

    const metric = document.createElement('div');
    metric.className = 'ranking-entry__metric';
    const details = typeof config.metric === 'function'
      ? config.metric(player)
      : { primary: '', secondary: '' };

    const primary = document.createElement('span');
    primary.className = 'ranking-entry__metric-primary';
    primary.textContent = details.primary || '';

    const secondary = document.createElement('span');
    secondary.className = 'ranking-entry__metric-secondary';
    secondary.textContent = details.secondary || '';

    metric.appendChild(primary);
    if (secondary.textContent) {
      metric.appendChild(secondary);
    }

    entry.appendChild(positionElement);
    entry.appendChild(avatarContainer);
    entry.appendChild(info);
    entry.appendChild(metric);

    return entry;
  }

  function renderRanking(config, panel) {
    const list = panel.querySelector('.ranking-panel__list');
    if (!list) {
      return;
    }
    list.innerHTML = '';
    const entries = prepareRanking(config);
    entries.forEach((player, index) => {
      list.appendChild(createEntry(player, index + 1, config));
    });
  }

  function rotateTo(index) {
    if (!panels.length) {
      return;
    }
    activeIndex = (index + panels.length) % panels.length;
    panels.forEach((panel, idx) => {
      const isActive = idx === activeIndex;
      panel.classList.toggle('ranking-panel--active', isActive);
      panel.setAttribute('aria-hidden', String(!isActive));
    });
    indicators.forEach((indicator, idx) => {
      indicator.classList.toggle('ranking-indicator--active', idx === activeIndex);
      indicator.setAttribute('aria-pressed', String(idx === activeIndex));
    });
  }

  function scheduleRotation() {
    if (rotationHandle) {
      window.clearInterval(rotationHandle);
    }
    rotationHandle = window.setInterval(() => {
      rotateTo(activeIndex + 1);
    }, ROTATION_INTERVAL);
  }

  function buildIndicators(container) {
    indicators = RANKING_DEFINITIONS.map((config, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ranking-indicator';
      button.setAttribute('aria-label', `${config.label}`);
      button.addEventListener('click', () => {
        rotateTo(index);
        scheduleRotation();
      });
      container.appendChild(button);
      return button;
    });
  }

  async function loadPlayers() {
    try {
      const response = await fetch('data/ranking.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar ranking (${response.status})`);
      }
      const payload = await response.json();
      const rawPlayers = payload?.players || [];
      players = rawPlayers.map(enrichPlayer);
      updateStatus(payload?.updatedAt ? `Atualizado em ${new Date(payload.updatedAt).toLocaleString('pt-BR')}` : 'Ranking sincronizado');
      panels.forEach(panel => {
        const id = panel.dataset.rankingId;
        const config = RANKING_DEFINITIONS.find(item => item.id === id);
        if (config) {
          renderRanking(config, panel);
        }
      });
      rotateTo(0);
      scheduleRotation();
    } catch (error) {
      console.error('Erro ao carregar ranking', error);
      updateStatus('Não foi possível carregar o ranking agora. Tente novamente mais tarde.', true);
    }
  }

  function updateStatus(message, isError = false) {
    if (!statusElement) {
      return;
    }
    statusElement.hidden = !message;
    statusElement.textContent = message;
    statusElement.classList.toggle('ranking-status--error', Boolean(isError));
  }

  function init(context = {}) {
    const root = context && context.root ? context.root : document;
    const scope = context && context.container ? context.container : root;
    statusElement = scope.querySelector('#ranking-status');
    panels = Array.from(scope.querySelectorAll('.ranking-panel'));
    const indicatorContainer = scope.querySelector('#ranking-indicators');

    if (!panels.length) {
      console.warn('Nenhum painel de ranking encontrado.');
      return;
    }

    if (indicatorContainer) {
      indicatorContainer.innerHTML = '';
      buildIndicators(indicatorContainer);
    }

    updateStatus('Carregando ranking...');
    loadPlayers();
  }

  if (window && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-ranking', init);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }
})();
