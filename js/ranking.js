(function () {
  const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';
  const ROTATION_INTERVAL = 6000;
  const RANKING_CATEGORIES = [
    {
      key: 'level',
      title: 'Ranking 1 · Nível travado em 1',
      subtitle: 'Jogadores que alcançaram os maiores níveis gerais.',
      formatMetric: (entry) => `Nível ${Math.max(1, Math.floor(entry.level || 1))}`,
      buildMeta: (entry) => `Pontos gerais: ${Number(entry.totalPoints || 0).toLocaleString('pt-BR')}`
    },
    {
      key: 'speed',
      title: 'Ranking 2 · Os mais rápidos',
      subtitle: 'Quem mantém a maior média de caracteres por minuto.',
      formatMetric: (entry) => {
        const value = Number(entry.metric || entry.bestCpm || 0);
        return value > 0 ? `${Math.round(value)} CPM` : 'Sem dados';
      },
      buildMeta: (entry) => `Nível atual: ${Math.max(1, Math.floor(entry.level || 1))}`
    },
    {
      key: 'points',
      title: 'Ranking 3 · Mais pontos',
      subtitle: 'Soma total de pontos acumulados pelo jogador.',
      formatMetric: (entry) => `${Number(entry.totalPoints || 0).toLocaleString('pt-BR')} pts`,
      buildMeta: (entry) => `Melhor sequência: ${Math.max(0, entry.bestSequential || 0)} acertos`
    },
    {
      key: 'aura',
      title: 'Ranking 4 · Aura Score',
      subtitle: 'A combinação perfeita das três medalhas mais frequentes.',
      formatMetric: (entry) => {
        const score = entry.aura && typeof entry.aura.score === 'number' ? entry.aura.score : 0;
        return entry.aura && entry.aura.hasAura ? `Aura ${score.toFixed(2)}` : 'Aura 0';
      },
      buildMeta: (entry) => `Medalhas recentes: ${entry.aura && entry.aura.total ? entry.aura.total : 0}`
    },
    {
      key: 'monthly',
      title: 'Ranking 5 · Melhores do mês',
      subtitle: 'Precisão geral do mês (modos 3, 4, 5 e 6).',
      formatMetric: (entry) => {
        const value = Number(entry.metric || entry.monthlyAccuracy || 0);
        return `${(value * 100).toFixed(1)}% precisão`;
      },
      buildMeta: (entry) => {
        const stats = entry.monthlyStats || { correct: 0, total: 0 };
        return `Tentativas válidas: ${Number(stats.total || 0).toLocaleString('pt-BR')}`;
      }
    },
    {
      key: 'streak',
      title: 'Ranking 6 · Acertos sequenciais',
      subtitle: 'Quem mais acertou frases consecutivas sem errar.',
      formatMetric: (entry) => `${Math.max(0, entry.metric || entry.bestSequential || 0)} acertos`,
      buildMeta: (entry) => `Aura Score: ${entry.aura && entry.aura.hasAura ? entry.aura.score.toFixed(2) : '0.00'}`
    }
  ];

  let statusElement = null;
  let carouselElement = null;
  let tabsElement = null;
  let rotationTimer = null;
  let currentIndex = 0;
  let cachedData = null;

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function showStatus(message, isError = false) {
    if (!statusElement) {
      return;
    }
    if (!message) {
      statusElement.hidden = true;
      statusElement.textContent = '';
      statusElement.classList.remove('ranking-status--error');
      return;
    }
    statusElement.hidden = false;
    statusElement.textContent = message;
    statusElement.classList.toggle('ranking-status--error', Boolean(isError));
  }

  function clearPanels() {
    if (!carouselElement) {
      return;
    }
    carouselElement.innerHTML = '';
  }

  function applyAura(element, aura) {
    if (!element) {
      return;
    }
    if (window.playtalkAura && typeof window.playtalkAura.applyAura === 'function') {
      window.playtalkAura.applyAura(element, aura);
      return;
    }
    element.classList.remove('has-aura');
    element.style.removeProperty('--aura-gradient');
    if (aura && aura.hasAura && aura.gradient) {
      element.classList.add('has-aura');
      element.style.setProperty('--aura-gradient', aura.gradient);
    }
  }

  function createEntryElement(entry, category) {
    const item = document.createElement('li');
    item.className = 'ranking-entry';
    if (Number(entry.position) <= 3) {
      item.classList.add('ranking-entry--top');
    }

    const position = document.createElement('span');
    position.className = 'ranking-entry__position';
    position.textContent = `${entry.position || 0}º`;

    const avatarWrapper = document.createElement('span');
    avatarWrapper.className = 'ranking-entry__avatar aura-ring';
    const img = document.createElement('img');
    img.className = 'aura-ring__image';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = entry.avatar && entry.avatar.trim() ? entry.avatar : DEFAULT_AVATAR;
    img.alt = `Foto de ${entry.displayName || 'Jogador'}`;
    avatarWrapper.appendChild(img);
    applyAura(avatarWrapper, entry.aura);

    const details = document.createElement('div');
    details.className = 'ranking-entry__details';

    const name = document.createElement('p');
    name.className = 'ranking-entry__name';
    name.textContent = entry.displayName || 'Vazio';

    const meta = document.createElement('p');
    meta.className = 'ranking-entry__meta';
    try {
      meta.textContent = category.buildMeta(entry);
    } catch (error) {
      meta.textContent = '';
    }

    details.appendChild(name);
    if (meta.textContent) {
      details.appendChild(meta);
    }

    const metric = document.createElement('span');
    metric.className = 'ranking-entry__metric';
    try {
      metric.textContent = category.formatMetric(entry);
    } catch (error) {
      metric.textContent = '';
    }

    item.appendChild(position);
    item.appendChild(avatarWrapper);
    item.appendChild(details);
    item.appendChild(metric);
    return item;
  }

  function createPanel(category, entries) {
    const panel = document.createElement('section');
    panel.className = 'ranking-panel';
    panel.dataset.rankingKey = category.key;
    panel.setAttribute('role', 'tabpanel');

    const header = document.createElement('header');
    header.className = 'ranking-panel__header';

    const title = document.createElement('h2');
    title.className = 'ranking-panel__title';
    title.textContent = category.title;

    const subtitle = document.createElement('p');
    subtitle.className = 'ranking-panel__subtitle';
    subtitle.textContent = category.subtitle;

    header.appendChild(title);
    header.appendChild(subtitle);

    const list = document.createElement('ol');
    list.className = 'ranking-entries';
    list.setAttribute('aria-label', category.title);

    entries.forEach((entry) => {
      list.appendChild(createEntryElement(entry, category));
    });

    panel.appendChild(header);
    panel.appendChild(list);
    return panel;
  }

  function renderPanels(data) {
    if (!carouselElement) {
      return;
    }
    clearPanels();
    const fragment = document.createDocumentFragment();
    RANKING_CATEGORIES.forEach((category) => {
      const entries = (data && data[category.key]) ? data[category.key] : [];
      fragment.appendChild(createPanel(category, entries));
    });
    carouselElement.appendChild(fragment);
  }

  function setActiveCategory(index, options = {}) {
    const { userInteraction = false } = options;
    if (!carouselElement || !tabsElement) {
      return;
    }
    const panels = Array.from(carouselElement.querySelectorAll('.ranking-panel'));
    const tabs = qsa('.ranking-tab');
    if (!panels.length || !tabs.length) {
      return;
    }
    const normalizedIndex = ((index % panels.length) + panels.length) % panels.length;
    panels.forEach((panel, idx) => {
      panel.classList.toggle('is-active', idx === normalizedIndex);
      panel.setAttribute('aria-hidden', idx === normalizedIndex ? 'false' : 'true');
    });
    tabs.forEach((tab, idx) => {
      const isActive = idx === normalizedIndex;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      tab.disabled = isActive;
    });
    currentIndex = normalizedIndex;
    if (userInteraction) {
      restartRotation();
    }
  }

  function advanceCategory() {
    setActiveCategory(currentIndex + 1);
  }

  function restartRotation() {
    if (rotationTimer) {
      clearInterval(rotationTimer);
    }
    rotationTimer = window.setInterval(advanceCategory, ROTATION_INTERVAL);
  }

  async function loadRankings() {
    showStatus('Carregando ranking...');
    try {
      const response = await fetch('/api/rankings', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar rankings (${response.status})`);
      }
      const payload = await response.json();
      if (!payload || payload.success === false) {
        throw new Error((payload && payload.message) || 'Resposta inválida do servidor.');
      }
      cachedData = payload.rankings || {};
      renderPanels(cachedData);
      showStatus('');
      setActiveCategory(0);
      restartRotation();
    } catch (error) {
      console.error('Erro ao carregar rankings:', error);
      showStatus('Não foi possível carregar o ranking agora. Tente novamente mais tarde.', true);
    }
  }

  function bindTabEvents() {
    const tabs = qsa('.ranking-tab');
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        setActiveCategory(index, { userInteraction: true });
      });
      tab.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          setActiveCategory(index + 1, { userInteraction: true });
          tabs[(index + 1) % tabs.length].focus();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          const previous = (index - 1 + tabs.length) % tabs.length;
          setActiveCategory(previous, { userInteraction: true });
          tabs[previous].focus();
        }
      });
    });
  }

  function init() {
    statusElement = qs('#ranking-status');
    carouselElement = qs('#ranking-carousel');
    tabsElement = qs('#ranking-tabs');

    if (!carouselElement || !tabsElement) {
      console.warn('Elementos principais do ranking não encontrados.');
      return;
    }

    bindTabEvents();
    loadRankings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
