(function () {
  const API_ENDPOINT = '/api/rankings';
  const DEFAULT_AVATAR_URL = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';
  const MAX_POSITION = 30;
  let isLoading = false;
  let controller = null;

  const numberFormatter = new Intl.NumberFormat('pt-BR');
  const percentFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const cpmFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

  const SECTION_CONFIG = {
    fast: {
      value(entry) {
        const fastValue = entry && Number.isFinite(entry.fastCpm)
          ? entry.fastCpm
          : entry && Number.isFinite(entry.cpm)
            ? entry.cpm
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
        const pieces = [];
        pieces.push(`${cpmFormatter.format(Math.max(0, entry.cpm || 0))} cpm`);
        pieces.push(`${percentFormatter.format(Math.max(0, Math.min(100, entry.accuracy || 0)))} de precisão`);
        return pieces.join(' • ');
      }
    },
    diamonds: {
      value(entry) {
        return `${numberFormatter.format(Math.max(0, entry.diamantes || 0))}`;
      },
      detail(entry) {
        return `${numberFormatter.format(Math.max(0, entry.points || 0))} pts acumulados`;
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
    const meta = document.createElement('span');
    meta.className = 'ranking-row__meta';
    meta.textContent = typeof config.detail === 'function' ? config.detail(entry) : '';
    info.appendChild(name);
    info.appendChild(meta);

    const value = document.createElement('div');
    value.className = 'ranking-row__value';
    value.textContent = typeof config.value === 'function' ? config.value(entry) : '';

    row.appendChild(position);
    row.appendChild(avatarWrapper);
    row.appendChild(info);
    row.appendChild(value);
    return row;
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

  function initRankingPage() {
    const scope = document.querySelector('.container-screen--ranking');
    if (!scope) {
      return;
    }
    const refreshButton = $('[data-ranking-refresh]', scope);
    const updatedLabel = $('[data-ranking-updated]', scope);
    const errorEl = $('[data-ranking-error]', scope);

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
