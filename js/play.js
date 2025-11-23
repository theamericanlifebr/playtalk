(function() {
  const MODE_CONFIG = [
    { id: 1, title: 'Vocabulary', logline: 'Panorama geral com seu melhor ritmo.', color: '#3fd286' },
    { id: 2, title: 'Meaning', logline: 'Interpretações certeiras, no tom dourado.', color: '#f2c11f' },
    { id: 3, title: 'Listening', logline: 'Audição afiada e respostas rápidas.', color: '#ff8b3d' },
    { id: 4, title: 'Reading', logline: 'Leitura premium e foco total.', color: '#4a9cff' },
    { id: 5, title: 'Translating', logline: 'Traduções quentes com clareza.', color: '#9a6dff' },
    { id: 6, title: 'Thinking', logline: 'Raciocínio afiado em vermelho vivo.', color: '#ff4f6d' }
  ];

  const DEFAULT_AVATAR_URL = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';

  const GENERAL_META = {
    id: null,
    title: 'Painel geral',
    logline: 'Visão macro com o desempenho combinado dos modos.'
  };

  const TOP_CONFIG = {
    streak: {
      key: 'streak',
      title: 'Melhores sequências',
      logline: 'Quem mantém a chama acesa por mais tempo.',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 2 4 14h5v8l7-12h-5z"/></svg>',
      value(entry) {
        return formatInteger(entry.bestStreak || entry.currentStreak || 0);
      },
      detail(entry) {
        return `Atual: ${formatInteger(entry.currentStreak || 0)} • ${formatInteger(entry.points || 0)} pts`;
      }
    },
    cpm: {
      key: 'fast',
      title: 'Melhor CPM',
      logline: 'Ritmo premium em cada frase.',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5h-2v5.41l3.29 3.3 1.42-1.42L13 11.59Z"/></svg>',
      value(entry) {
        const cps = Number.isFinite(entry.cps) ? entry.cps : (entry.fastCps || 0);
        return `${formatInteger(Math.max(0, Math.round(cps * 60)))} cpm`;
      },
      detail(entry) {
        return `${formatPercent(entry.accuracy || 0)} de precisão`;
      }
    },
    accuracy: {
      key: 'accuracy',
      title: 'Mais precisos',
      logline: 'Quem erra menos e decide mais.',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 3 5v6c0 5 3.84 9.74 9 11 5.16-1.26 9-6 9-11V5Zm0 13a4 4 0 1 1 4-4 4 4 0 0 1-4 4Zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2Z"/></svg>',
      value(entry) {
        return formatPercent(entry.accuracy || 0);
      },
      detail(entry) {
        return `${formatInteger(entry.totalPhrases || 0)} frases registradas`;
      }
    },
    level: {
      key: 'level',
      title: 'Quem tem mais nível',
      logline: 'A escalada mais quente do app.',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16v2H4Zm12-9h4l-6-9-6 9h4v6h4Z"/></svg>',
      value(entry) {
        return `Nível ${formatInteger(entry.level || 1)}`;
      },
      detail(entry) {
        return `${formatInteger(entry.points || 0)} pts totais`;
      }
    }
  };

  const MEDAL_CONFIG = [
    { key: 'diamante', label: 'Diamante', icon: 'medalhas/diamante.png' },
    { key: 'ouro', label: 'Ouro', icon: 'medalhas/ouro.png' },
    { key: 'prata', label: 'Prata', icon: 'medalhas/prata.png' },
    { key: 'bronze', label: 'Bronze', icon: 'medalhas/bronze.png' }
  ];

  let statsData = {};
  let activeMode = null;
  let rankings = {};

  function formatInteger(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0';
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

  function refreshStatsData() {
    statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');
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
      medals: normalizeMedals(stats.medals),
      bestStreak: Math.max(0, Math.floor(stats.bestStreak || 0)),
      currentStreak: Math.max(0, Math.floor(stats.currentStreak || 0))
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

  function getSummary(mode) {
    if (!mode) return calcGeneralStats();
    return calcModeStats(mode);
  }

  function createMedalsSection(summary) {
    const section = document.createElement('section');
    section.className = 'stats-section stats-section--medals';
    const header = document.createElement('div');
    header.className = 'stats-section__header';
    const title = document.createElement('h2');
    title.textContent = 'Quadro de medalhas';
    header.appendChild(title);
    section.appendChild(header);

    const counts = normalizeMedals(summary.medals);
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
      if (!count) return;
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

  function createNumberCard(label, value, detail) {
    const card = document.createElement('div');
    card.className = 'stat-metric stat-metric--panel';
    const labelEl = document.createElement('span');
    labelEl.className = 'stat-metric__label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'stat-metric__value';
    valueEl.textContent = value;
    card.appendChild(labelEl);
    card.appendChild(valueEl);
    if (detail) {
      const detailEl = document.createElement('span');
      detailEl.className = 'stat-metric__detail';
      detailEl.textContent = detail;
      card.appendChild(detailEl);
    }
    return card;
  }

  function createNumbersSection(summary) {
    const section = document.createElement('section');
    section.className = 'stats-section stats-section--numbers';
    const header = document.createElement('div');
    header.className = 'stats-section__header';
    const title = document.createElement('h2');
    title.textContent = 'Números do jogador';
    header.appendChild(title);
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'stats-metrics stats-metrics--panel';
    grid.appendChild(createNumberCard('Velocidade', `${formatCps(summary.cps)} cps`, `${formatInteger(Math.round(summary.cps * 60))} cpm`));
    grid.appendChild(createNumberCard('Precisão', formatPercent(summary.accuracyPerc)));
    grid.appendChild(createNumberCard('Melhor sequência', formatInteger(summary.bestStreak || 0), `Atual: ${formatInteger(summary.currentStreak || 0)}`));
    grid.appendChild(createNumberCard('Frases certas', formatInteger(summary.correctPhrases || 0), `${formatInteger(summary.totalPhrases || 0)} jogadas`));
    section.appendChild(grid);
    return section;
  }

  function createHero(summary, modeMeta) {
    const wrapper = document.createElement('section');
    wrapper.className = 'stats-hero';
    const visual = document.createElement('div');
    visual.className = 'stats-hero__visual';
    const badge = document.createElement('div');
    badge.className = 'stats-hero__badge';
    const heroImg = document.createElement('img');
    heroImg.src = modeMeta.id ? `selos%20modos%20de%20jogo/modo${modeMeta.id}.png` : 'selos%20modos%20de%20jogo/logoitalk2.png';
    heroImg.alt = modeMeta.title || 'Modo de jogo';
    badge.appendChild(heroImg);
    const title = document.createElement('h1');
    title.className = 'stats-title';
    title.textContent = modeMeta.title;
    visual.appendChild(badge);
    visual.appendChild(title);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'stats-hero__copy';
    const logline = document.createElement('p');
    logline.className = 'stats-hero__lead';
    logline.textContent = modeMeta.logline;
    const chips = document.createElement('div');
    chips.className = 'stats-hero__chips';
    const chipData = [
      { label: 'Precisão', value: formatPercent(summary.accuracyPerc) },
      { label: 'CPM', value: `${formatInteger(Math.round(summary.cps * 60))}` },
      { label: 'Sequência', value: formatInteger(summary.bestStreak || summary.currentStreak || 0) }
    ];
    chipData.forEach(entry => {
      const chip = document.createElement('div');
      chip.className = 'stats-chip';
      const chipLabel = document.createElement('span');
      chipLabel.textContent = entry.label;
      const chipValue = document.createElement('strong');
      chipValue.textContent = entry.value;
      chip.appendChild(chipLabel);
      chip.appendChild(chipValue);
      chips.appendChild(chip);
    });

    titleWrap.appendChild(logline);
    titleWrap.appendChild(chips);

    wrapper.appendChild(visual);
    wrapper.appendChild(titleWrap);
    return wrapper;
  }

  function createModeSelector(onSelect, currentMode = null) {
    const section = document.createElement('section');
    section.className = 'stats-mode-selector';
    section.setAttribute('aria-label', 'Selecionar modo de jogo para a lente');

    const track = document.createElement('div');
    track.className = 'stats-mode-selector__track';
    section.appendChild(track);

    const buttons = [];

    function updateStates(active) {
      section.classList.toggle('has-selection', Boolean(active));
      buttons.forEach(btn => {
        const isActive = btn.dataset.mode === String(active);
        btn.classList.toggle('is-active', isActive);
      });
    }

    MODE_CONFIG.forEach(config => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stats-mode-selector__button';
      button.dataset.mode = config.id;
      button.setAttribute('aria-pressed', currentMode === config.id ? 'true' : 'false');
      button.setAttribute('title', config.title);

      const ring = document.createElement('span');
      ring.className = 'stats-mode-selector__ring';
      const rgb = hexToRgb(config.color || '#3fd286');
      ring.style.setProperty('--mode-color-rgb', rgb);
      const image = document.createElement('img');
      image.src = `selos%20modos%20de%20jogo/modo${config.id}.png`;
      image.alt = config.title;
      ring.appendChild(image);
      button.appendChild(ring);

      button.addEventListener('click', () => {
        const modeId = parseInt(button.dataset.mode, 10);
        const nextMode = activeMode === modeId ? null : modeId;
        activeMode = nextMode;
        buttons.forEach(btn => {
          const isActive = btn === button && nextMode;
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        updateStates(nextMode);
        onSelect(nextMode);
      });

      buttons.push(button);
      track.appendChild(button);
    });

    updateStates(currentMode);

    return section;
  }

  function buildTopNav(config, onChange) {
    const nav = document.createElement('nav');
    nav.className = 'ranking-carousel__nav stats-top__nav';
    Object.values(config).forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ranking-carousel__nav-button ranking-carousel__nav-button--icon';
      button.dataset.topKey = entry.key;
      button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');

      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'ranking-carousel__nav-icon';
      iconWrapper.innerHTML = entry.icon;
      button.appendChild(iconWrapper);

      if (index === 0) {
        button.classList.add('is-active');
      }
      button.addEventListener('click', () => onChange(entry.key, button));
      nav.appendChild(button);
    });
    return nav;
  }

  function createTopList() {
    const ul = document.createElement('ul');
    ul.className = 'stats-top__list';
    return ul;
  }

  function renderTopEntries(listEl, entries, config) {
    listEl.innerHTML = '';
    if (!entries || !entries.length) {
      const empty = document.createElement('li');
      empty.className = 'stats-top__empty';
      empty.textContent = 'Sem jogadores neste ranking ainda.';
      listEl.appendChild(empty);
      return;
    }
    entries.slice(0, 10).forEach((entry, index) => {
      const row = document.createElement('li');
      row.className = 'ranking-row ranking-row--compact';
      const position = document.createElement('span');
      position.className = 'ranking-row__position';
      position.textContent = index + 1;
      const avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'ranking-row__avatar';
      const avatar = document.createElement('img');
      avatar.src = entry.avatar || DEFAULT_AVATAR_URL;
      avatar.alt = `Foto de ${entry.displayName || entry.username || 'Jogador'}`;
      avatar.loading = 'lazy';
      avatarWrapper.appendChild(avatar);
      const info = document.createElement('div');
      info.className = 'ranking-row__info';
      const name = document.createElement('strong');
      name.className = 'ranking-row__name';
      name.textContent = entry.displayName || entry.username || 'Jogador';
      info.appendChild(name);
      const meta = document.createElement('span');
      meta.className = 'ranking-row__meta';
      meta.textContent = typeof config.detail === 'function' ? config.detail(entry) : '';
      info.appendChild(meta);
      const value = document.createElement('div');
      value.className = 'ranking-row__value';
      value.textContent = typeof config.value === 'function' ? config.value(entry) : '';
      row.appendChild(position);
      row.appendChild(avatarWrapper);
      row.appendChild(info);
      row.appendChild(value);
      listEl.appendChild(row);
    });
  }

  function createTopSection() {
    const section = document.createElement('section');
    section.className = 'stats-section stats-section--top';
    const header = document.createElement('div');
    header.className = 'stats-section__header';
    const headerCopy = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = 'Os 10 melhores';
    headerCopy.appendChild(title);

    const list = createTopList();
    let currentKey = Object.values(TOP_CONFIG)[0].key;
    let cachedData = {};
    let currentModeFilter = null;

    function scopeEntriesForMode(entries, mode) {
      if (!mode) return entries || [];
      const modeKey = String(mode);
      return (entries || [])
        .map(entry => {
          const modeData = entry && entry.modes && entry.modes[modeKey];
          if (!modeData) return null;
          return { ...entry, ...modeData };
        })
        .filter(item => item && (item.totalPhrases || item.correctPhrases || item.correctChars || item.points || item.bestStreak));
    }

    const nav = buildTopNav(TOP_CONFIG, (key, button) => {
      currentKey = key;
      nav.querySelectorAll('button').forEach(btn => {
        const isActive = btn === button;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      const config = Object.values(TOP_CONFIG).find(entry => entry.key === key);
      const scoped = scopeEntriesForMode(cachedData[currentKey] || [], currentModeFilter);
      title.textContent = config ? config.title : 'Ranking';
      renderTopEntries(list, scoped, config || {});
    });

    header.appendChild(headerCopy);
    header.appendChild(nav);
    section.appendChild(header);
    section.appendChild(list);

    return { section, update: (data, mode) => {
      cachedData = data || {};
      currentModeFilter = mode || null;
      const config = Object.values(TOP_CONFIG).find(entry => entry.key === currentKey);
      const scoped = scopeEntriesForMode(cachedData[currentKey] || [], currentModeFilter);
      title.textContent = config ? config.title : 'Ranking';
      renderTopEntries(list, scoped, config || {});
    } };
  }

  function hexToRgb(hex) {
    const int = parseInt(hex.slice(1), 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }

  function applyLens(mode) {
    if (window.playtalkLens && typeof window.playtalkLens.applyLens === 'function') {
      window.playtalkLens.applyLens(mode);
    }
  }

  function hideLens() {
    if (window.playtalkLens && typeof window.playtalkLens.hideLens === 'function') {
      window.playtalkLens.hideLens();
    }
  }

  function swapSection(container, oldSection, newSection) {
    if (!oldSection || !oldSection.parentNode) {
      container.insertBefore(newSection, container.firstChild);
      return newSection;
    }
    newSection.classList.add('stats-slide', 'is-entering');
    oldSection.classList.add('stats-slide', 'is-leaving');
    oldSection.after(newSection);
    requestAnimationFrame(() => {
      newSection.classList.add('is-active');
      oldSection.classList.add('is-off');
    });
    setTimeout(() => {
      if (oldSection.parentNode) {
        oldSection.parentNode.removeChild(oldSection);
      }
      newSection.classList.remove('stats-slide', 'is-entering', 'is-active');
    }, 240);
    return newSection;
  }

  function initPlayPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const container = scope.querySelector('#play-content');
    if (!container) return;

    refreshStatsData();
    activeMode = null;

    const summary = getSummary(activeMode);
    const modeMeta = GENERAL_META;

    container.innerHTML = '';
    const selector = createModeSelector((mode) => {
      const newSummary = getSummary(mode);
      const meta = mode ? (MODE_CONFIG.find(item => item.id === mode) || GENERAL_META) : GENERAL_META;
      const updatedHero = createHero(newSummary, meta);
      heroSection = swapSection(container, heroSection, updatedHero);
      const newMedals = createMedalsSection(newSummary);
      medalsSection = swapSection(container, medalsSection, newMedals);
      const newNumbers = createNumbersSection(newSummary);
      numbersSection = swapSection(container, numbersSection, newNumbers);
      updateTop(rankings, mode);
      if (mode) {
        applyLens(mode);
      } else {
        hideLens();
      }
    }, activeMode);
    container.appendChild(selector);
    let heroSection = createHero(summary, modeMeta);
    container.appendChild(heroSection);
    let medalsSection = createMedalsSection(summary);
    container.appendChild(medalsSection);
    let numbersSection = createNumbersSection(summary);
    container.appendChild(numbersSection);

    const { section: topSection, update: updateTop } = createTopSection();
    container.appendChild(topSection);

    if (activeMode) {
      applyLens(activeMode);
    } else {
      hideLens();
    }

    fetch('/api/rankings', { method: 'GET', cache: 'no-store' })
      .then(res => res.json())
      .then(payload => {
        rankings = payload && payload.rankings ? payload.rankings : {};
        updateTop(rankings, activeMode);
      })
      .catch(error => {
        console.warn('Não foi possível carregar os rankings', error);
      });

    document.addEventListener('playtalk:user-change', () => {
      refreshStatsData();
      const updated = getSummary(activeMode);
      const meta = activeMode ? (MODE_CONFIG.find(item => item.id === activeMode) || GENERAL_META) : GENERAL_META;
      const refreshedHero = createHero(updated, meta);
      heroSection = swapSection(container, heroSection, refreshedHero);
      const refreshedMedals = createMedalsSection(updated);
      medalsSection = swapSection(container, medalsSection, refreshedMedals);
      const refreshedNumbers = createNumbersSection(updated);
      numbersSection = swapSection(container, numbersSection, refreshedNumbers);
      updateTop(rankings, activeMode);
    });
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-play', initPlayPage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initPlayPage(), { once: true });
  } else {
    initPlayPage();
  }
})();
