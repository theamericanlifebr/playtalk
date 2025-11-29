(function() {
  const MODE_CONFIG = [
    { id: 1, title: 'Vocabulary', logline: 'Panorama geral com seu melhor ritmo.', color: '#c8e54a' },
    { id: 2, title: 'Explore', logline: 'Interpretações certeiras, no tom dourado.', color: '#ffd700' },
    { id: 3, title: 'Listening', logline: 'Audição afiada e respostas rápidas.', color: '#ff6c3e' },
    { id: 4, title: 'Reading', logline: 'Leitura premium e foco total.', color: '#2196f3' },
    { id: 5, title: 'Building', logline: 'Traduções quentes com clareza.', color: '#1b004b' },
    { id: 6, title: 'Fluent', logline: 'Raciocínio afiado em ritmo multicolorido.', color: '#c8e54a' }
  ];

  const DEFAULT_AVATAR_URL = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';

  const GENERAL_META = {
    id: null,
    title: 'Painel geral',
    logline: 'Visão macro com o desempenho combinado dos modos.'
  };

  const modeLogoAPI = window.playtalkModeLogos || null;

  function buildModeLogo(mode, extraClass = '') {
    if (modeLogoAPI && typeof modeLogoAPI.createModeLogoElement === 'function') {
      const logo = modeLogoAPI.createModeLogoElement(mode || 1, extraClass);
      logo.setAttribute('aria-hidden', 'true');
      return logo;
    }
    const fallback = document.createElement('div');
    fallback.className = ['mode-logo', extraClass].filter(Boolean).join(' ');
    fallback.dataset.mode = String(mode || 1);
    fallback.setAttribute('aria-hidden', 'true');
    return fallback;
  }

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

  function formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${seconds}s`;
  }

  function formatWords(totalChars) {
    const words = Math.max(0, Math.floor((Number(totalChars) || 0) / 5));
    return formatInteger(words);
  }

  function formatBalanceValue() {
    const balanceAPI = window.playtalkBalance;
    const rawBalance = balanceAPI && typeof balanceAPI.getBalance === 'function'
      ? balanceAPI.getBalance()
      : 0;
    const normalized = Number.isFinite(Number(rawBalance)) ? Number(rawBalance) : 0;
    return normalized.toLocaleString('pt-BR');
  }

  function getJoinDateInfo() {
    const user = window.playtalkAuth && typeof window.playtalkAuth.getCurrentUser === 'function'
      ? window.playtalkAuth.getCurrentUser()
      : null;
    const candidates = [
      localStorage.getItem('firstLoginAt'),
      user && (user.createdAt || user.created_at),
      user && user.data && (user.data.createdAt || user.data.created_at)
    ].filter(Boolean);
    let rawDate = candidates.find(Boolean) || null;
    if (!rawDate) {
      rawDate = new Date().toISOString();
      localStorage.setItem('firstLoginAt', rawDate);
    }
    const parsed = rawDate ? new Date(rawDate) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

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
    const wrong = stats.wrong || Math.max(0, totalPhrases - correctPhrases);
    const accuracyPerc = totalPhrases ? (correctPhrases / totalPhrases * 100) : 0;
    const seconds = totalTime > 0 ? (totalTime / 1000) : 0;
    const cps = seconds > 0 ? (correctChars / seconds) : 0;
    const noReportPerc = totalPhrases ? (100 - (report / totalPhrases * 100)) : 100;
    return {
      totalPhrases,
      correctPhrases,
      totalChars,
      correctChars,
      wrongPhrases: wrong,
      accuracyPerc,
      cps,
      noReportPerc,
      totalTime,
      reportCount: report,
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
      wrongPhrases: 0,
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
      totals.wrongPhrases += (stats.wrong || Math.max(0, (stats.totalPhrases || 0) - (stats.correct || 0)));
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
      wrongPhrases: totals.wrongPhrases,
      accuracyPerc,
      cps,
      noReportPerc,
      totalTime: totals.totalTime,
      reportCount: totals.report,
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
    const list = document.createElement('ul');
    list.className = 'stats-medal-board__grid';
    MEDAL_CONFIG.forEach(({ key, label, icon }) => {
      const count = counts[key];
      const item = document.createElement('li');
      item.className = 'stats-medal-board__item';
      if (!count) {
        item.classList.add('stats-medal-board__item--empty');
      }
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

  const METRIC_ICONS = {
    lightning: '<svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M11 2 3.5 13h6L8.5 22 20 8h-6l2-6Z"/></svg>',
    coin: '<svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M12 3C7.03 3 3 5.686 3 9v6c0 3.314 4.03 6 9 6s9-2.686 9-6V9c0-3.314-4.03-6-9-6Zm0 2c3.86 0 7 1.57 7 3.5S15.86 12 12 12 5 10.43 5 8.5 8.14 5 12 5Zm7 6.758V15c0 1.93-3.14 3.5-7 3.5S5 16.93 5 15v-3.242C6.44 12.742 8.96 13.5 12 13.5s5.56-.758 7-1.742ZM11 7v1.5H9.5V11H11v1.5h2V11h1.5V8.5H13V7Z"/></svg>',
    target: '<svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M12 2a1 1 0 0 1 1 1v1.25a8.5 8.5 0 0 1 7.75 7.75H22a1 1 0 0 1 0 2h-1.25A8.5 8.5 0 0 1 13 21.75V23a1 1 0 0 1-2 0v-1.25A8.5 8.5 0 0 1 3.25 14H2a1 1 0 1 1 0-2h1.25A8.5 8.5 0 0 1 11 4.25V3a1 1 0 0 1 1-1Zm0 5.5a7 7 0 1 0 7 7 7.008 7.008 0 0 0-7-7Zm0 3a4 4 0 1 1-4 4 4.004 4.004 0 0 1 4-4Zm0 2a2 2 0 1 0 2 2 2.002 2.002 0 0 0-2-2Z"/></svg>'
  };

  function createNumbersSlide({ value, caption, icon }) {
    const slide = document.createElement('div');
    slide.className = 'post-game-metric container-animado-score stats-numbers-slide';

    const values = document.createElement('div');
    values.className = 'post-game-metric__values';

    const iconEl = document.createElement('span');
    iconEl.className = `post-game-metric__icon post-game-metric__icon--${icon}`;
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.innerHTML = METRIC_ICONS[icon] || '';
    values.appendChild(iconEl);

    const valueEl = document.createElement('span');
    valueEl.className = 'post-game-metric__value';
    valueEl.textContent = value;
    values.appendChild(valueEl);

    const captionEl = document.createElement('p');
    captionEl.className = 'post-game-metric__caption';
    captionEl.textContent = caption;

    slide.appendChild(values);
    slide.appendChild(captionEl);

    return slide;
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

    const slider = document.createElement('div');
    slider.className = 'stats-numbers-slider';

    const slidesData = [
      { value: `${formatInteger(Math.round(summary.cps * 60))} cpm`, caption: 'Caracteres por minuto', icon: 'lightning' },
      { value: `R$ ${formatBalanceValue()}`, caption: 'Saldo em pontos', icon: 'coin' },
      { value: formatPercent(summary.accuracyPerc), caption: 'Precisão geral', icon: 'target' }
    ];

    const slides = slidesData.map((entry, index) => {
      const slide = createNumbersSlide(entry);
      if (index === 0) slide.classList.add('is-active');
      slider.appendChild(slide);
      return slide;
    });

    section.appendChild(slider);

    if (slides.length > 1) {
      let currentIndex = 0;
      const intervalId = setInterval(() => {
        if (!section.isConnected) {
          clearInterval(intervalId);
          return;
        }

        const currentSlide = slides[currentIndex];
        currentIndex = (currentIndex + 1) % slides.length;
        const nextSlide = slides[currentIndex];

        currentSlide.classList.remove('is-active');
        currentSlide.classList.add('is-leaving');
        nextSlide.classList.add('is-active');
        nextSlide.classList.remove('is-leaving');

        setTimeout(() => currentSlide.classList.remove('is-leaving'), 320);
      }, 2000);
    }

    return section;
  }

  function createHero(summary, modeMeta) {
    const wrapper = document.createElement('section');
    wrapper.className = 'stats-hero';
    const visual = document.createElement('div');
    visual.className = 'stats-hero__visual';
    const badge = document.createElement('div');
    badge.className = 'stats-hero__badge';
    const heroLogo = buildModeLogo(modeMeta.id || 1, 'mode-logo--overlay');
    badge.appendChild(heroLogo);
    const title = document.createElement('h1');
    title.className = 'stats-title';
    title.textContent = modeMeta.title;
    visual.appendChild(badge);
    visual.appendChild(title);
    wrapper.appendChild(visual);
    return wrapper;
  }

  function createPlayerStatsSection(summary) {
    const section = document.createElement('section');
    section.className = 'stats-section stats-section--totals';
    const header = document.createElement('div');
    header.className = 'stats-section__header';
    const title = document.createElement('h2');
    title.textContent = 'Estatísticas';
    header.appendChild(title);
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'stats-list';

    const wrong = Math.max(0, summary.wrongPhrases || (summary.totalPhrases - summary.correctPhrases));
    const reportRate = wrong > 0 ? (summary.reportCount || 0) / wrong * 100 : 0;
    const joinDate = getJoinDateInfo();

    const entries = [
      { label: 'Frases totais', value: formatInteger(summary.totalPhrases || 0) },
      { label: 'Frases certas', value: formatInteger(summary.correctPhrases || 0) },
      { label: 'Frases erradas', value: formatInteger(wrong) },
      { label: 'Palavras faladas', value: formatWords(summary.totalChars) },
      { label: 'Tempo de jogo', value: formatDuration(summary.totalTime) },
      { label: 'Reports', value: formatPercent(reportRate) },
      { label: 'No PlayTalk desde', value: joinDate
        ? joinDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : '—' },
      { label: 'Saldo', value: `R$ ${formatBalanceValue()}` }
    ];

    entries.forEach(({ label, value }) => {
      const row = document.createElement('div');
      row.className = 'stats-list__item';
      const rowLabel = document.createElement('span');
      rowLabel.className = 'stats-list__label';
      rowLabel.textContent = label;
      const rowValue = document.createElement('span');
      rowValue.className = 'stats-list__value';
      rowValue.textContent = value;
      row.appendChild(rowLabel);
      row.appendChild(rowValue);
      list.appendChild(row);
    });

    section.appendChild(list);
    return section;
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

      const rgb = hexToRgb(config.color || '#3fd286');
      button.style.setProperty('--mode-color-rgb', rgb);
      const logo = buildModeLogo(config.id, 'stats-mode-selector__icon mode-logo--small');
      button.appendChild(logo);

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
    let heroSection = createHero(summary, modeMeta);
    container.appendChild(heroSection);
    const selector = createModeSelector((mode) => {
      const newSummary = getSummary(mode);
      const meta = mode ? (MODE_CONFIG.find(item => item.id === mode) || GENERAL_META) : GENERAL_META;
      const updatedHero = createHero(newSummary, meta);
      heroSection = swapSection(container, heroSection, updatedHero);
      const newMedals = createMedalsSection(newSummary);
      medalsSection = swapSection(container, medalsSection, newMedals);
      const newNumbers = createNumbersSection(newSummary);
      numbersSection = swapSection(container, numbersSection, newNumbers);
      const newPlayerStats = createPlayerStatsSection(newSummary);
      playerStatsSection = swapSection(container, playerStatsSection, newPlayerStats);
      updateTop(rankings, mode);
      if (mode) {
        applyLens(mode);
      } else {
        applyLens('stats');
      }
    }, activeMode);
    container.appendChild(selector);
    let medalsSection = createMedalsSection(summary);
    container.appendChild(medalsSection);
    let numbersSection = createNumbersSection(summary);
    container.appendChild(numbersSection);

    const { section: topSection, update: updateTop } = createTopSection();
    container.appendChild(topSection);

    let playerStatsSection = createPlayerStatsSection(summary);
    container.appendChild(playerStatsSection);

    if (activeMode) {
      applyLens(activeMode);
    } else {
      applyLens('stats');
    }

    if (modeLogoAPI && typeof modeLogoAPI.renderAllModeLogos === 'function') {
      modeLogoAPI.renderAllModeLogos(container);
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
      const refreshedPlayerStats = createPlayerStatsSection(updated);
      playerStatsSection = swapSection(container, playerStatsSection, refreshedPlayerStats);
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
