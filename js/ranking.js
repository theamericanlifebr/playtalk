(function () {
  const API_ENDPOINT = '/api/rankings';
  const DEFAULT_AVATAR_URL = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';
  const MAX_POSITION = 30;
  const CAROUSEL_SECTIONS = ['fast', 'points', 'diamonds', 'streak', 'monthly', 'legends'];
  let isLoading = false;
  let controller = null;

  const numberFormatter = new Intl.NumberFormat('pt-BR');
  const percentFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const cpmFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

  const SECTION_CONFIG = {
    fast: {
      value(entry) {
        const fastValue = entry && Number.isFinite(entry.cpm)
          ? entry.cpm
          : entry && Number.isFinite(entry.fastCpm)
            ? entry.fastCpm
            : 0;
        return `${cpmFormatter.format(Math.max(0, fastValue || 0))} cpm`;
      },
      detail(entry) {
        const accuracyText = `${percentFormatter.format(Math.max(0, Math.min(100, entry.accuracy || 0)))} de precisão`;
        const recentCount = Math.max(0, entry && entry.recentPhraseCount ? entry.recentPhraseCount : 0);
        if (!recentCount) {
          return accuracyText;
        }
        const label = recentCount === 1 ? 'frase recente' : 'frases recentes';
        const prefix = recentCount === 1 ? 'Baseado na última' : 'Baseado nas últimas';
        return `${accuracyText} • ${prefix} ${numberFormatter.format(recentCount)} ${label}`;
      }
    },
    points: {
      value(entry) {
        return `${numberFormatter.format(Math.max(0, entry.points || 0))} pts`;
      },
      detail(entry) {
        return `${numberFormatter.format(Math.max(0, entry.points || 0))} pts totais`;
      }
    },
    diamonds: {
      value(entry) {
        return `${numberFormatter.format(Math.max(0, entry.diamantes || 0))}`;
      },
      detail(entry) {
        return '';
      }
    },
    streak: {
      value(entry) {
        return `${numberFormatter.format(Math.max(0, entry.bestStreak || 0))}`;
      },
      detail(entry) {
        return `Sequência atual ${numberFormatter.format(Math.max(0, entry.currentStreak || 0))}`;
      }
    },
    monthly: {
      value(entry) {
        return `${numberFormatter.format(Math.max(0, entry.monthlyPoints || 0))} pts`;
      },
      detail(entry) {
        return `${numberFormatter.format(Math.max(0, entry.points || 0))} pts totais`;
      }
    },
    legends: {
      value(entry) {
        return `${cpmFormatter.format(Math.max(0, entry.cpm || 0))} cpm`;
      },
      detail(entry) {
        return `${percentFormatter.format(Math.max(0, Math.min(100, entry.accuracy || 0)))} • ${numberFormatter.format(Math.max(0, entry.diamantes || 0))} diamantes`;
      }
    }
  };

  function $(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function getSectionElements(sectionKey) {
    const container = document.querySelector(`[data-ranking-section="${sectionKey}"]`);
    if (!container) {
      return null;
    }
    return {
      container,
      list: container.querySelector('[data-ranking-list]'),
      empty: container.querySelector('[data-ranking-empty]')
    };
  }

  function createRankingRow(entry, index, config) {
    const row = document.createElement('li');
    row.className = 'ranking-row';

    const position = document.createElement('span');
    position.className = 'ranking-row__position';
    position.textContent = index + 1;
    position.setAttribute('aria-label', `Posição ${index + 1}`);

    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'ranking-row__avatar';
    const avatar = document.createElement('img');
    avatar.loading = 'lazy';
    avatar.src = entry.avatar || DEFAULT_AVATAR_URL;
    avatar.alt = `Foto de ${entry.displayName}`;
    avatarWrapper.appendChild(avatar);

    const info = document.createElement('div');
    info.className = 'ranking-row__info';
    const name = document.createElement('strong');
    name.className = 'ranking-row__name';
    name.textContent = entry.displayName || entry.username || 'Jogador';
    info.appendChild(name);
    const detailText = typeof config.detail === 'function' ? config.detail(entry) : '';
    if (detailText) {
      const meta = document.createElement('span');
      meta.className = 'ranking-row__meta';
      meta.textContent = detailText;
      info.appendChild(meta);
    }

    const value = document.createElement('div');
    value.className = 'ranking-row__value';
    value.textContent = typeof config.value === 'function' ? config.value(entry) : '';

    row.appendChild(position);
    row.appendChild(avatarWrapper);
    row.appendChild(info);
    row.appendChild(value);
    return row;
  }

  function updateBannerAvatars(data = {}) {
    CAROUSEL_SECTIONS.forEach((sectionKey) => {
      const entries = Array.isArray(data[sectionKey]) ? data[sectionKey].slice(0, 3) : [];
      const targets = document.querySelectorAll(`[data-banner="${sectionKey}"], [data-banner-thumb="${sectionKey}"]`);
      targets.forEach((banner) => {
        const label = banner.getAttribute('data-banner-label') || sectionKey;
        const avatars = banner.querySelectorAll('[data-banner-avatar]');
        avatars.forEach((avatarEl, index) => {
          const img = avatarEl.querySelector('img');
          if (!img) {
            return;
          }
          const entry = entries[index];
          if (entry) {
            img.src = entry.avatar || DEFAULT_AVATAR_URL;
            const playerName = entry.displayName || entry.username || 'Jogador';
            img.alt = `${playerName} no ranking ${label}`;
          } else {
            img.src = DEFAULT_AVATAR_URL;
            img.alt = `Slot disponível no ranking ${label}`;
          }
        });
      });
    });
  }

  function setUpdatedAt(timestamp, target) {
    if (!target) {
      return;
    }
    if (!timestamp) {
      target.textContent = 'Não atualizado';
      return;
    }
    try {
      const date = new Date(timestamp);
      target.textContent = `Atualizado em ${date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`;
    } catch (error) {
      target.textContent = 'Atualizado recentemente';
    }
  }

  function setLoadingState(loading, refreshButton, errorEl) {
    isLoading = loading;
    if (refreshButton) {
      refreshButton.disabled = loading;
      refreshButton.textContent = loading ? 'Atualizando...' : 'Atualizar agora';
    }
    if (loading && errorEl) {
      errorEl.hidden = true;
    }
  }

  async function fetchRankings() {
    if (controller) {
      controller.abort();
    }
    controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined
    });
    if (!response.ok) {
      throw new Error('Não foi possível carregar os rankings.');
    }
    return response.json();
  }

  function renderSections(data) {
    Object.entries(SECTION_CONFIG).forEach(([sectionKey, config]) => {
      const elements = getSectionElements(sectionKey);
      if (!elements || !elements.list) {
        return;
      }
      const entries = Array.isArray(data[sectionKey]) ? data[sectionKey] : [];
      elements.list.innerHTML = '';
      if (!entries.length) {
        if (elements.empty) {
          elements.empty.hidden = false;
        }
        return;
      }
      if (elements.empty) {
        elements.empty.hidden = true;
      }
      entries.slice(0, MAX_POSITION).forEach((entry, index) => {
        elements.list.appendChild(createRankingRow(entry, index, config));
      });
    });
    updateBannerAvatars(data);
  }

  async function loadRankings({ refreshButton, updatedLabel, errorEl } = {}) {
    if (isLoading) {
      return;
    }
    setLoadingState(true, refreshButton, errorEl);
    try {
      const payload = await fetchRankings();
      const rankings = payload && payload.rankings ? payload.rankings : {};
      renderSections(rankings);
      setUpdatedAt(payload.generatedAt, updatedLabel);
    } catch (error) {
      console.error('Erro ao carregar rankings:', error);
      if (errorEl) {
        errorEl.textContent = 'Não foi possível carregar o ranking. Tente novamente em instantes.';
        errorEl.hidden = false;
      }
    } finally {
      controller = null;
      setLoadingState(false, refreshButton, errorEl);
    }
  }

  function initRankingCarousel(scope) {
    const nav = $('[data-ranking-carousel-nav]', scope);
    const track = $('[data-ranking-carousel-track]', scope);
    const viewport = $('[data-ranking-carousel-viewport]', scope);
    const bannerTrack = $('[data-ranking-banner-track]', scope);
    const bannerThumbTrack = $('[data-ranking-banner-thumb-track]', scope);
    if (!nav || !track) {
      return;
    }

    const cards = CAROUSEL_SECTIONS
      .map(sectionKey => track.querySelector(`[data-ranking-section="${sectionKey}"]`))
      .filter(Boolean);
    const navButtons = CAROUSEL_SECTIONS
      .map(sectionKey => nav.querySelector(`[data-ranking-nav="${sectionKey}"]`))
      .filter(Boolean);
    const bannerCards = bannerTrack
      ? CAROUSEL_SECTIONS.map(sectionKey => bannerTrack.querySelector(`[data-banner="${sectionKey}"]`)).filter(Boolean)
      : [];
    const bannerThumbs = bannerThumbTrack
      ? CAROUSEL_SECTIONS.map(sectionKey => bannerThumbTrack.querySelector(`[data-banner-thumb="${sectionKey}"]`)).filter(Boolean)
      : [];

    if (!cards.length || !navButtons.length) {
      return;
    }

    const indexByKey = new Map();
    cards.forEach((card, index) => {
      const key = card.getAttribute('data-ranking-section');
      if (key) {
        indexByKey.set(key, index);
      }
    });

    let currentIndex = 0;
    const initialKey = navButtons.find(button => button.classList.contains('is-active'))?.dataset.rankingNav
      || cards[0].dataset.rankingSection;
    if (initialKey && indexByKey.has(initialKey)) {
      currentIndex = indexByKey.get(initialKey);
    }

    function applyState() {
      track.style.setProperty('--ranking-carousel-index', String(currentIndex));
      cards.forEach((card, index) => {
        const isActive = index === currentIndex;
        card.classList.toggle('is-active', isActive);
        card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
      navButtons.forEach((button) => {
        const targetKey = button.dataset.rankingNav;
        const targetIndex = targetKey ? indexByKey.get(targetKey) : null;
        const isActive = targetIndex === currentIndex;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      if (bannerTrack && bannerCards.length) {
        bannerTrack.style.setProperty('--banner-index', String(currentIndex));
        bannerCards.forEach((card, index) => {
          const isActive = index === currentIndex;
          card.classList.toggle('is-active', isActive);
          card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
      }
      if (bannerThumbTrack && bannerThumbs.length) {
        bannerThumbTrack.style.setProperty('--banner-index', String(currentIndex));
        bannerThumbs.forEach((thumb, index) => {
          const isActive = index === currentIndex;
          thumb.classList.toggle('is-active', isActive);
          thumb.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
      }
    }

    function goToIndex(index) {
      const normalized = Math.max(0, Math.min(index, cards.length - 1));
      if (normalized === currentIndex) {
        applyState();
        return normalized;
      }
      currentIndex = normalized;
      applyState();
      return normalized;
    }

    function goToKey(key) {
      if (!key || !indexByKey.has(key)) {
        return;
      }
      goToIndex(indexByKey.get(key));
    }

    function focusButtonForIndex(index) {
      const target = navButtons.find(button => {
        const key = button.dataset.rankingNav;
        return key && indexByKey.get(key) === index;
      });
      if (target) {
        target.focus();
      }
    }

    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        goToKey(button.dataset.rankingNav);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const delta = event.key === 'ArrowRight' ? 1 : -1;
          const nextIndex = goToIndex(currentIndex + delta);
          focusButtonForIndex(nextIndex);
        }
      });
    });

    bannerThumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const key = thumb.dataset.bannerThumb;
        if (key) {
          goToKey(key);
        }
      });
    });

    if (viewport) {
      let startX = 0;
      let tracking = false;
      viewport.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary) {
          return;
        }
        tracking = true;
        startX = event.clientX;
      });
      viewport.addEventListener('pointerup', (event) => {
        if (!tracking || !event.isPrimary) {
          return;
        }
        const delta = event.clientX - startX;
        if (Math.abs(delta) > 40) {
          goToIndex(currentIndex + (delta < 0 ? 1 : -1));
        }
        tracking = false;
      });
      viewport.addEventListener('pointerleave', () => {
        tracking = false;
      });
      viewport.addEventListener('pointercancel', () => {
        tracking = false;
      });
    }

    applyState();
  }

  function initRankingPage() {
    const scope = document.querySelector('.container-screen--ranking');
    if (!scope) {
      return;
    }
    const refreshButton = $('[data-ranking-refresh]', scope);
    const updatedLabel = $('[data-ranking-updated]', scope);
    const errorEl = $('[data-ranking-error]', scope);

    initRankingCarousel(scope);

    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        loadRankings({ refreshButton, updatedLabel, errorEl });
      });
    }

    loadRankings({ refreshButton, updatedLabel, errorEl });
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-ranking', initRankingPage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRankingPage, { once: true });
  } else {
    initRankingPage();
  }
})();
