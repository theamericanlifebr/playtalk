(function() {
  const MODE_CONFIG = [
    { id: 1, title: 'Vocabulary', logline: 'Panorama geral com seu melhor ritmo.', color: '#3fd286' },
    { id: 2, title: 'Meaning', logline: 'Interpretações certeiras, no tom dourado.', color: '#f2c11f' },
    { id: 3, title: 'Listening', logline: 'Audição afiada e respostas rápidas.', color: '#ff8b3d' },
    { id: 4, title: 'Reading', logline: 'Leitura premium e foco total.', color: '#4a9cff' },
    { id: 5, title: 'Translating', logline: 'Traduções quentes com clareza.', color: '#9a6dff' },
    { id: 6, title: 'Thinking', logline: 'Raciocínio afiado em vermelho vivo.', color: '#ff4f6d' }
  ];

  const TOP_CONFIG = {
    streak: {
      key: 'streak',
      title: 'Melhores sequências',
      logline: 'Quem mantém a chama acesa por mais tempo.',
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
  let activeMode = 1;
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
    if (mode === 1) return calcGeneralStats();
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
    const titleWrap = document.createElement('div');
    titleWrap.className = 'stats-hero__copy';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'stats-hero__eyebrow';
    eyebrow.textContent = 'Lente de resultados';
    const title = document.createElement('h1');
    title.className = 'stats-title';
    title.textContent = modeMeta.title;
    const logline = document.createElement('p');
    logline.className = 'stats-hero__lead';
    logline.textContent = modeMeta.logline;
    titleWrap.appendChild(eyebrow);
    titleWrap.appendChild(title);
    titleWrap.appendChild(logline);

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

    wrapper.appendChild(titleWrap);
    wrapper.appendChild(chips);
    return wrapper;
  }

  function buildBannerCard(config) {
    const card = document.createElement('article');
    card.className = 'ranking-banner__card stats-banner__card';
    card.dataset.mode = String(config.id);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    const rgb = hexToRgb(config.color || '#3fd286');
    card.style.setProperty('--banner-strong', `rgba(${rgb}, 0.65)`);
    card.style.setProperty('--banner-soft', `rgba(${rgb}, 0.5)`);
    card.style.setProperty('--banner-color', `rgba(${rgb}, 0.5)`);

    const content = document.createElement('div');
    content.className = 'ranking-banner__content';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'ranking-banner__eyebrow';
    eyebrow.textContent = 'Modo de jogo';
    const title = document.createElement('h2');
    title.textContent = config.title;
    const logline = document.createElement('p');
    logline.className = 'ranking-banner__logline';
    logline.textContent = config.logline;
    content.appendChild(eyebrow);
    content.appendChild(title);
    content.appendChild(logline);

    card.appendChild(content);
    return card;
  }

  function createModeCarousel(onSelect, currentMode = 1) {
    const section = document.createElement('section');
    section.className = 'ranking-banner stats-banner';
    section.setAttribute('aria-label', 'Banners dos modos de jogo');

    const viewport = document.createElement('div');
    viewport.className = 'ranking-banner__viewport';
    const track = document.createElement('div');
    track.className = 'ranking-banner__track';
    const cards = [];

    function setActive(modeId) {
      cards.forEach(card => {
        card.classList.toggle('is-active', card.dataset.mode === String(modeId));
      });
    }

    MODE_CONFIG.forEach((config, index) => {
      const card = buildBannerCard(config);
      if (index === 0) {
        card.classList.add('is-active');
      }
      cards.push(card);
      card.addEventListener('click', () => {
        setActive(config.id);
        onSelect(config.id);
      });
      card.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setActive(config.id);
          onSelect(config.id);
        }
      });
      track.appendChild(card);
    });

    setActive(currentMode);

    viewport.appendChild(track);
    section.appendChild(viewport);
    return section;
  }

  function buildTopNav(config, onChange) {
    const nav = document.createElement('nav');
    nav.className = 'ranking-carousel__nav stats-top__nav';
    Object.values(config).forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ranking-carousel__nav-button';
      if (index === 0) {
        button.classList.add('is-active');
      }
      button.dataset.topKey = entry.key;
      button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
      button.textContent = entry.title;
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
    const eyebrow = document.createElement('p');
    eyebrow.className = 'stats-hero__eyebrow';
    eyebrow.textContent = 'Os 10 melhores';
    const title = document.createElement('h2');
    title.textContent = 'Carrossel de rankings';
    headerCopy.appendChild(eyebrow);
    headerCopy.appendChild(title);

    const list = createTopList();
    let currentKey = Object.values(TOP_CONFIG)[0].key;

    const nav = buildTopNav(TOP_CONFIG, (key, button) => {
      currentKey = key;
      nav.querySelectorAll('button').forEach(btn => {
        const isActive = btn === button;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      renderTopEntries(list, rankings[currentKey] || [], Object.values(TOP_CONFIG).find(entry => entry.key === key));
    });

    header.appendChild(headerCopy);
    header.appendChild(nav);
    section.appendChild(header);
    section.appendChild(list);

    return { section, update: (data) => {
      renderTopEntries(list, data[currentKey] || [], Object.values(TOP_CONFIG).find(entry => entry.key === currentKey));
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

  function initPlayPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const container = scope.querySelector('#play-content');
    if (!container) return;

    refreshStatsData();
    activeMode = 1;

    const summary = getSummary(activeMode);
    const modeMeta = MODE_CONFIG.find(item => item.id === activeMode) || MODE_CONFIG[0];

    container.innerHTML = '';
    let heroSection = createHero(summary, modeMeta);
    container.appendChild(heroSection);
    let medalsSection = createMedalsSection(summary);
    let numbersSection = createNumbersSection(summary);
    const carousel = createModeCarousel((mode) => {
      activeMode = mode;
      const newSummary = getSummary(mode);
      const meta = MODE_CONFIG.find(item => item.id === mode) || modeMeta;
      const updatedHero = createHero(newSummary, meta);
      container.replaceChild(updatedHero, heroSection);
      heroSection = updatedHero;
      const newMedals = createMedalsSection(newSummary);
      container.replaceChild(newMedals, medalsSection);
      medalsSection = newMedals;
      const newNumbers = createNumbersSection(newSummary);
      container.replaceChild(newNumbers, numbersSection);
      numbersSection = newNumbers;
      applyLens(mode);
    }, activeMode);

    container.appendChild(carousel);
    container.appendChild(medalsSection);
    container.appendChild(numbersSection);

    const { section: topSection, update: updateTop } = createTopSection();
    container.appendChild(topSection);

    applyLens(activeMode);

    fetch('/api/rankings', { method: 'GET', cache: 'no-store' })
      .then(res => res.json())
      .then(payload => {
        rankings = payload && payload.rankings ? payload.rankings : {};
        updateTop(rankings);
      })
      .catch(error => {
        console.warn('Não foi possível carregar os rankings', error);
      });

    document.addEventListener('playtalk:user-change', () => {
      refreshStatsData();
      const updated = getSummary(activeMode);
      const meta = MODE_CONFIG.find(item => item.id === activeMode) || modeMeta;
      const refreshedHero = createHero(updated, meta);
      container.replaceChild(refreshedHero, heroSection);
      heroSection = refreshedHero;
      const refreshedMedals = createMedalsSection(updated);
      container.replaceChild(refreshedMedals, medalsSection);
      medalsSection = refreshedMedals;
      const refreshedNumbers = createNumbersSection(updated);
      container.replaceChild(refreshedNumbers, numbersSection);
      numbersSection = refreshedNumbers;
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
