(function() {
  const CAROUSEL_INTERVAL = 5000;
  const CAROUSEL_REFERENCE = Date.UTC(2025, 9, 31, 23, 0, 0);
  const CAROUSEL_CONFIG = [
    {
      id: 'level',
      title: 'Ranking 1 · Atual (Mais nível)',
      subtitle: 'Jogadores com os níveis mais altos no momento.',
      ariaLabel: 'Ranking por nível',
      indicatorLabel: 'Mais nível',
      metricFormatter: null
    },
    {
      id: 'points',
      title: 'Ranking 2 · "Mais Pontos"',
      subtitle: 'Ranking ordenado por pontos gerais.',
      ariaLabel: 'Ranking por pontos gerais',
      indicatorLabel: 'Mais pontos',
      metricFormatter: (entry) => `${entry.points.toLocaleString('pt-BR')} pontos`
    },
    {
      id: 'vocabulary',
      title: 'Ranking 3 · Vocabulary · Modo 1',
      subtitle: 'Pontuações mais altas no modo 1 do Vocabulary.',
      ariaLabel: 'Ranking de Vocabulary modo 1',
      indicatorLabel: 'Vocabulary modo 1',
      metricFormatter: (entry) => `${entry.mode1Points.toLocaleString('pt-BR')} pts no modo 1`
    },
    {
      id: 'speed',
      title: 'Ranking 4 · Os mais rápidos',
      subtitle: 'As melhores médias de tempo geral.',
      ariaLabel: 'Ranking dos jogadores mais rápidos',
      indicatorLabel: 'Mais rápidos',
      metricFormatter: (entry) => {
        const formatted = entry.speedPercent.toLocaleString('pt-BR', {
          minimumFractionDigits: entry.speedPercent % 1 === 0 ? 0 : 1,
          maximumFractionDigits: 1
        });
        return `Velocidade média: ${formatted}%`;
      }
    }
  ];

  let listElement = null;
  let statusElement = null;
  let titleElement = null;
  let descriptionElement = null;
  let indicatorsElement = null;

  let carouselData = null;
  let currentIndex = 0;
  let autoRotateTimer = null;
  let indicatorEventsBound = false;

  function assignElements(context) {
    const root = context && context.root ? context.root : document;
    const scope = context && context.container ? context.container : root;
    listElement = scope.querySelector('#ranking-list');
    statusElement = scope.querySelector('#ranking-status');
    titleElement = scope.querySelector('#ranking-title');
    descriptionElement = scope.querySelector('#ranking-description');
    indicatorsElement = scope.querySelector('#ranking-indicators');

    if (listElement) {
      listElement.dataset.state = 'ready';
    }

    if (indicatorsElement) {
      indicatorsElement.innerHTML = '';
    }
  }

  function showStatus(message, isError = false) {
    if (!statusElement) {
      return;
    }
    statusElement.textContent = message;
    statusElement.classList.toggle('ranking-status--error', Boolean(isError));
    statusElement.hidden = !message;
  }

  function buildCard(entry, config) {
    const card = document.createElement('article');
    card.className = 'ranking-card';
    if (entry.position <= 3) {
      card.classList.add('ranking-card--top');
    }

    const media = document.createElement('div');
    media.className = 'ranking-card__media';

    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'ranking-avatar-wrapper';

    const avatar = document.createElement('img');
    avatar.className = 'ranking-avatar';
    avatar.src = entry.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(entry.name)}`;
    avatar.alt = `Foto de perfil de ${entry.name}`;
    avatar.loading = 'lazy';
    avatar.decoding = 'async';
    avatarWrapper.appendChild(avatar);

    const badge = document.createElement('span');
    badge.className = 'ranking-position-badge';
    badge.textContent = `${entry.position}º`;
    avatarWrapper.appendChild(badge);

    const levelIndicator = document.createElement('p');
    levelIndicator.className = 'ranking-level-indicator';
    levelIndicator.textContent = `Nível ${entry.level}`;

    media.appendChild(avatarWrapper);
    media.appendChild(levelIndicator);

    const info = document.createElement('div');
    info.className = 'ranking-info';

    const name = document.createElement('h2');
    name.className = 'ranking-name';
    name.textContent = entry.name;
    info.appendChild(name);

    if (config.metricFormatter) {
      const metric = document.createElement('p');
      metric.className = 'ranking-metric';
      metric.textContent = config.metricFormatter(entry);
      info.appendChild(metric);
    }

    card.appendChild(media);
    card.appendChild(info);
    return card;
  }

  function renderList(entries, config) {
    if (!listElement) {
      return;
    }

    listElement.innerHTML = '';
    listElement.dataset.ranking = config.id;

    entries.forEach(entry => {
      listElement.appendChild(buildCard(entry, config));
    });

    listElement.scrollTop = 0;
    showStatus(entries.length ? '' : 'Nenhum jogador encontrado.');
  }

  function updateHeader(config) {
    if (titleElement) {
      titleElement.textContent = config.title;
    }
    if (descriptionElement) {
      descriptionElement.textContent = config.subtitle;
    }
  }

  function ensureIndicators() {
    if (!indicatorsElement) {
      return;
    }

    if (indicatorsElement.childElementCount !== CAROUSEL_CONFIG.length) {
      indicatorsElement.innerHTML = '';
      CAROUSEL_CONFIG.forEach((config, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ranking-carousel__indicator';
        button.dataset.index = String(index);
        button.dataset.rankingId = config.id;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', 'ranking-list');
        button.setAttribute('aria-label', config.indicatorLabel || config.title);
        button.title = config.title;
        indicatorsElement.appendChild(button);
      });
    }

    const buttons = indicatorsElement.querySelectorAll('.ranking-carousel__indicator');
    buttons.forEach((button, index) => {
      const isActive = index === currentIndex;
      button.classList.toggle('ranking-carousel__indicator--active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
      button.textContent = String(index + 1);
    });
  }

  function dissolveTransition(renderFn, options = {}) {
    if (!listElement) {
      renderFn();
      return;
    }

    const animate = options.animate !== false;
    if (!animate) {
      renderFn();
      listElement.dataset.state = 'ready';
      return;
    }

    let leaveTimeout = null;
    let enterTimeout = null;

    const cleanupEnter = () => {
      listElement.removeEventListener('transitionend', handleEnterEnd);
      if (enterTimeout !== null) {
        clearTimeout(enterTimeout);
      }
      listElement.dataset.state = 'ready';
    };

    const handleEnterEnd = (event) => {
      if (event && event.propertyName && event.propertyName !== 'opacity') {
        return;
      }
      cleanupEnter();
    };

    const startEnterPhase = () => {
      requestAnimationFrame(() => {
        listElement.addEventListener('transitionend', handleEnterEnd);
        enterTimeout = window.setTimeout(cleanupEnter, 650);
        listElement.dataset.state = 'entering';
      });
    };

    const cleanupLeave = () => {
      listElement.removeEventListener('transitionend', handleLeaveEnd);
      if (leaveTimeout !== null) {
        clearTimeout(leaveTimeout);
      }
      renderFn();
      startEnterPhase();
    };

    const handleLeaveEnd = (event) => {
      if (event && event.propertyName && event.propertyName !== 'opacity') {
        return;
      }
      cleanupLeave();
    };

    listElement.addEventListener('transitionend', handleLeaveEnd);
    leaveTimeout = window.setTimeout(cleanupLeave, 650);
    listElement.dataset.state = 'leaving';
  }

  function showRankingByIndex(index, options = {}) {
    if (!carouselData || !CAROUSEL_CONFIG.length) {
      return;
    }

    const normalized = ((index % CAROUSEL_CONFIG.length) + CAROUSEL_CONFIG.length) % CAROUSEL_CONFIG.length;
    const config = CAROUSEL_CONFIG[normalized];
    const entries = carouselData[config.id] || [];

    currentIndex = normalized;

    const render = () => {
      updateHeader(config);
      renderList(entries, config);
      ensureIndicators();
    };

    dissolveTransition(render, options);
  }

  function computeIndexFromTime(referenceTime = Date.now()) {
    if (!CAROUSEL_CONFIG.length) {
      return 0;
    }
    const diff = referenceTime - CAROUSEL_REFERENCE;
    const steps = Math.floor(diff / CAROUSEL_INTERVAL);
    const normalized = ((steps % CAROUSEL_CONFIG.length) + CAROUSEL_CONFIG.length) % CAROUSEL_CONFIG.length;
    return normalized;
  }

  function getTimeToNextTick(now = Date.now()) {
    const elapsed = now - CAROUSEL_REFERENCE;
    const remainder = ((elapsed % CAROUSEL_INTERVAL) + CAROUSEL_INTERVAL) % CAROUSEL_INTERVAL;
    const delay = CAROUSEL_INTERVAL - remainder;
    return delay === 0 ? CAROUSEL_INTERVAL : delay;
  }

  function scheduleNextRotation() {
    if (!carouselData) {
      return;
    }
    clearTimeout(autoRotateTimer);
    const delay = getTimeToNextTick();
    autoRotateTimer = window.setTimeout(() => {
      const nextIndex = computeIndexFromTime(Date.now());
      showRankingByIndex(nextIndex, { animate: true });
      scheduleNextRotation();
    }, delay);
  }

  function prepareRanking(staticEntries = [], sharedEntries = []) {
    const combined = new Map();

    staticEntries
      .filter(entry => entry && entry.name)
      .forEach(entry => {
        const key = entry.name.trim().toLowerCase();
        combined.set(key, { ...entry, originalPosition: Number(entry.position) || Number.MAX_SAFE_INTEGER });
      });

    sharedEntries
      .filter(player => player && player.name)
      .forEach(player => {
        const key = (player.username || player.name).trim().toLowerCase();
        const base = combined.get(key);
        if (base) {
          const baseLevel = Number(base.level) || 0;
          if (player.level > baseLevel) {
            base.level = player.level;
          }
          if (player.avatar) {
            base.avatar = player.avatar;
          }
        } else {
          combined.set(key, {
            name: player.name,
            level: player.level,
            avatar: player.avatar,
            originalPosition: Number.MAX_SAFE_INTEGER
          });
        }
      });

    return Array.from(combined.values())
      .sort((a, b) => {
        const levelDiff = (Number(b.level) || 0) - (Number(a.level) || 0);
        if (levelDiff !== 0) {
          return levelDiff;
        }
        const posDiff = (Number(a.originalPosition) || Number.MAX_SAFE_INTEGER) - (Number(b.originalPosition) || Number.MAX_SAFE_INTEGER);
        if (posDiff !== 0) {
          return posDiff;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, 100)
      .map((entry, index) => {
        const { originalPosition, ...rest } = entry;
        return { ...rest, position: index + 1 };
      });
  }

  function buildCarouselData(staticEntries, sharedEntries = []) {
    const baseRanking = prepareRanking(staticEntries, sharedEntries);
    if (!baseRanking.length) {
      return {
        level: [],
        points: [],
        vocabulary: [],
        speed: []
      };
    }

    const augmented = baseRanking.map((entry, index) => {
      const level = Number(entry.level) || 1;
      const points = Math.max(180, 5000 - index * 42);
      const mode1Points = Math.max(150, 4000 - index * 31);
      const rawSpeed = 70 - index * 0.4;
      const speedPercent = Math.max(20, Math.round(rawSpeed * 10) / 10);
      return { ...entry, level, points, mode1Points, speedPercent };
    });

    const assignPositions = (entries, comparator) => {
      return entries
        .slice()
        .sort(comparator)
        .map((entry, index) => ({ ...entry, position: index + 1 }));
    };

    return {
      level: assignPositions(augmented, (a, b) => {
        const levelDiff = (b.level || 0) - (a.level || 0);
        if (levelDiff !== 0) {
          return levelDiff;
        }
        const pointsDiff = (b.points || 0) - (a.points || 0);
        if (pointsDiff !== 0) {
          return pointsDiff;
        }
        return a.name.localeCompare(b.name);
      }),
      points: assignPositions(augmented, (a, b) => {
        const diff = (b.points || 0) - (a.points || 0);
        if (diff !== 0) {
          return diff;
        }
        const levelDiff = (b.level || 0) - (a.level || 0);
        if (levelDiff !== 0) {
          return levelDiff;
        }
        return a.name.localeCompare(b.name);
      }),
      vocabulary: assignPositions(augmented, (a, b) => {
        const diff = (b.mode1Points || 0) - (a.mode1Points || 0);
        if (diff !== 0) {
          return diff;
        }
        const levelDiff = (b.level || 0) - (a.level || 0);
        if (levelDiff !== 0) {
          return levelDiff;
        }
        return a.name.localeCompare(b.name);
      }),
      speed: assignPositions(augmented, (a, b) => {
        const diff = (b.speedPercent || 0) - (a.speedPercent || 0);
        if (diff !== 0) {
          return diff;
        }
        const levelDiff = (b.level || 0) - (a.level || 0);
        if (levelDiff !== 0) {
          return levelDiff;
        }
        return a.name.localeCompare(b.name);
      })
    };
  }

  async function fetchSharedPlayers() {
    try {
      const response = await fetch('/api/users', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar usuários (${response.status})`);
      }
      const payload = await response.json();
      const users = payload && payload.users ? Object.values(payload.users) : [];
      return users
        .filter(entry => entry && entry.data && entry.data.shareResults)
        .map(entry => {
          const level = Number(entry.data.pastaAtual) || 1;
          const displayName = (entry.data.displayName && entry.data.displayName.trim()) || entry.username || 'Jogador';
          const avatar = typeof entry.data.avatar === 'string' && entry.data.avatar.trim()
            ? entry.data.avatar
            : '';
          return {
            username: entry.username,
            name: displayName,
            level,
            avatar: avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(entry.username || displayName)}`
          };
        });
    } catch (error) {
      console.warn('Não foi possível carregar jogadores que compartilham resultados:', error);
      return [];
    }
  }

  async function fetchRankingBase() {
    try {
      const response = await fetch('data/ranking.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar ranking: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Erro ao carregar ranking base:', error);
      return [];
    }
  }

  function handleIndicatorClick(event) {
    if (!indicatorsElement) {
      return;
    }
    const button = event.target.closest('.ranking-carousel__indicator');
    if (!button || !indicatorsElement.contains(button)) {
      return;
    }
    event.preventDefault();
    const index = Number(button.dataset.index);
    if (!Number.isFinite(index)) {
      return;
    }
    showRankingByIndex(index, { animate: true });
    scheduleNextRotation();
    button.focus();
  }

  function handleIndicatorKeydown(event) {
    if (!indicatorsElement) {
      return;
    }
    const button = event.target.closest('.ranking-carousel__indicator');
    if (!button || !indicatorsElement.contains(button)) {
      return;
    }

    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      return;
    }

    event.preventDefault();

    const buttons = Array.from(indicatorsElement.querySelectorAll('.ranking-carousel__indicator'));
    if (!buttons.length) {
      return;
    }

    let targetIndex = currentIndex;
    if (key === 'ArrowRight') {
      targetIndex = (currentIndex + 1) % buttons.length;
    } else if (key === 'ArrowLeft') {
      targetIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (key === 'Home') {
      targetIndex = 0;
    } else if (key === 'End') {
      targetIndex = buttons.length - 1;
    }

    showRankingByIndex(targetIndex, { animate: true });
    scheduleNextRotation();
    if (buttons[targetIndex]) {
      buttons[targetIndex].focus();
    }
  }

  function bindIndicatorEvents() {
    if (indicatorEventsBound) {
      return;
    }
    indicatorEventsBound = true;
    document.addEventListener('click', handleIndicatorClick);
    document.addEventListener('keydown', handleIndicatorKeydown);
  }

  async function loadRanking() {
    try {
      const [baseRanking, sharedPlayers] = await Promise.all([
        fetchRankingBase(),
        fetchSharedPlayers()
      ]);

      carouselData = buildCarouselData(baseRanking, sharedPlayers);
      const initialIndex = computeIndexFromTime();
      showRankingByIndex(initialIndex, { animate: false });
      scheduleNextRotation();
    } catch (error) {
      console.error('Erro ao carregar ranking', error);
      carouselData = null;
      showStatus('Não foi possível carregar o ranking agora. Tente novamente mais tarde.', true);
    }
  }

  function init(context = {}) {
    assignElements(context);
    bindIndicatorEvents();
    clearTimeout(autoRotateTimer);
    autoRotateTimer = null;
    carouselData = null;

    if (statusElement) {
      statusElement.hidden = false;
      statusElement.textContent = 'Carregando ranking...';
      statusElement.classList.remove('ranking-status--error');
    }

    if (listElement) {
      listElement.innerHTML = '';
      listElement.dataset.state = 'ready';
    }

    if (titleElement) {
      titleElement.textContent = CAROUSEL_CONFIG[0].title;
    }

    if (descriptionElement) {
      descriptionElement.textContent = CAROUSEL_CONFIG[0].subtitle;
    }

    if (indicatorsElement) {
      indicatorsElement.innerHTML = '';
    }

    loadRanking();

    return () => {
      clearTimeout(autoRotateTimer);
      autoRotateTimer = null;
    };
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
