(function () {
  function createSvgImage(title, colors) {
    const gradientStops = colors
      .map((color, index) => `<stop offset="${(index / (colors.length - 1)) * 100}%" stop-color="${color}" />`)
      .join('');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            ${gradientStops}
          </linearGradient>
        </defs>
        <rect width="320" height="320" rx="32" fill="url(#g)" />
        <circle cx="160" cy="116" r="48" fill="rgba(255,255,255,0.92)" />
        <text x="50%" y="215" text-anchor="middle" font-family="'Open Sans', Arial" font-size="28" fill="#0f172a" font-weight="700">
          ${title}
        </text>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  const PRODUCTS = [
    {
      id: 'maya-avatar',
      name: 'Maya',
      price: 500,
      image: 'users/maya.png',
      description: 'Avatar da Maya com brilho soft para usar no perfil e na vitrine da loja.',
    },
    {
      id: 'jimmy-avatar',
      name: 'Jimmy',
      price: 650,
      image: 'users/jimmy.png',
      description: 'Foto do Jimmy em alta definição para destacar nas partidas e no ranking.',
    },
    {
      id: 'bella-avatar',
      name: 'Bella',
      price: 800,
      image: 'users/bella.png',
      description: 'Retrato da Bella em moldura vívida, pronto para equipar na conta.',
    },
    {
      id: 'charlotte-avatar',
      name: 'Charlotte',
      price: 950,
      image: 'users/charlotte.png',
      description: 'Avatar da Charlotte com tons elegantes para suas sessões de treino.',
    },
    {
      id: 'willy-avatar',
      name: 'Willy',
      price: 1100,
      image: 'users/willy.png',
      description: 'Badge do Willy com moldura metálica para o perfil e conquistas.',
    },
    {
      id: 'bit-avatar',
      name: 'Bit',
      price: 1250,
      image: 'users/bit.png',
      description: 'Avatar do Bit em estilo pixel, perfeito para colecionadores.',
    },
    {
      id: 'pulse-avatar',
      name: 'Avatar Pulse',
      price: 1400,
      image: createSvgImage('Avatar', ['#a78bfa', '#6366f1']),
      description: 'Moldura pulsante com cores dinâmicas para destacar seu perfil nas telas.',
    },
    {
      id: 'calm-pack',
      name: 'Kit Calm',
      price: 1550,
      image: createSvgImage('Focus', ['#22d3ee', '#0ea5e9']),
      description: 'Pacote com loops relaxantes para estudar e jogar com foco total.',
    },
    {
      id: 'emoji-mini',
      name: 'Reações Mini',
      price: 1700,
      image: createSvgImage('Emoji', ['#facc15', '#f97316']),
      description: 'Coleção de reações rápidas para celebrar vitórias e combos no chat.',
    },
    {
      id: 'badge-starters',
      name: 'Badges Start',
      price: 1850,
      image: createSvgImage('Badge', ['#fda4af', '#fb7185']),
      description: 'Pacote inicial de badges 1x1 para montar um mural de conquistas.',
    },
    {
      id: 'voice-lite',
      name: 'Voz Lite',
      price: 2100,
      image: createSvgImage('Voz', ['#67e8f9', '#a5f3fc']),
      description: 'Filtro digital que clareia sua voz em desafios de speaking e chats.',
    },
    {
      id: 'xp-spark',
      name: 'Faísca XP',
      price: 2500,
      image: createSvgImage('XP', ['#34d399', '#10b981']),
      description: 'Impulso premium que libera faíscas extras de experiência nas sequências.',
    },
  ];

  const PURCHASES_KEY = 'playtalkStorePurchases';

  function formatPrice(value) {
    return `${value.toLocaleString('pt-BR')} moedas`;
  }

  function readPurchases() {
    try {
      const stored = JSON.parse(localStorage.getItem(PURCHASES_KEY) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      console.warn('Não foi possível ler as compras da store:', error);
      return [];
    }
  }

  function savePurchases(list) {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(list));
  }

  function initStorePage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const storeContainer = scope.querySelector('#store-container');
    if (!storeContainer) return;

    const tabs = Array.from(scope.querySelectorAll('.store-tab'));
    const grids = {
      shop: scope.querySelector('[data-store-grid="shop"]'),
      owned: scope.querySelector('[data-store-grid="owned"]'),
    };
    const emptyStates = {
      shop: scope.querySelector('[data-store-empty="shop"]'),
      owned: scope.querySelector('[data-store-empty="owned"]'),
    };

    const modal = scope.querySelector('[data-store-modal]');
    const modalPanel = modal ? modal.querySelector('.store-modal__panel') : null;
    const modalClose = modal ? modal.querySelector('[data-store-close]') : null;
    const modalBackdrop = modal ? modal.querySelector('[data-store-backdrop]') : null;
    const modalImage = modal ? modal.querySelector('[data-store-modal-image]') : null;
    const modalTitle = modal ? modal.querySelector('[data-store-modal-title]') : null;
    const modalDescription = modal ? modal.querySelector('[data-store-modal-description]') : null;
    const modalPrice = modal ? modal.querySelector('[data-store-modal-price]') : null;

    let purchases = readPurchases();
    let currentProduct = null;

    function isOwned(productId) {
      return purchases.includes(productId);
    }

    function setTab(target) {
      tabs.forEach((tab) => {
        const isTarget = tab.dataset.tab === target;
        tab.classList.toggle('is-active', isTarget);
        tab.setAttribute('aria-selected', String(isTarget));
      });
      Object.entries(grids).forEach(([key, grid]) => {
        if (!grid) return;
        const isVisible = key === target;
        grid.hidden = !isVisible;
      });
      Object.entries(emptyStates).forEach(([key, element]) => {
        if (!element) return;
        const isVisible = key === target;
        element.hidden = !isVisible || element.dataset.state !== 'visible';
      });
    }

    function updateEmptyStates() {
      const shopEmpty = PRODUCTS.length === 0;
      const ownedEmpty = purchases.length === 0;
      if (emptyStates.shop) {
        emptyStates.shop.dataset.state = shopEmpty ? 'visible' : 'hidden';
        emptyStates.shop.hidden = !shopEmpty;
      }
      if (emptyStates.owned) {
        emptyStates.owned.dataset.state = ownedEmpty ? 'visible' : 'hidden';
        emptyStates.owned.hidden = !ownedEmpty;
      }
    }

    function createButton(product, owned) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'store-button';
      if (owned) {
        button.classList.add('store-button--owned');
        button.textContent = 'Disponível';
        button.addEventListener('click', () => {
          setTab('owned');
          openModal(product);
        });
      } else {
        button.classList.add('store-button--buy');
        button.textContent = 'Comprar';
        button.addEventListener('click', () => openModal(product));
      }
      return button;
    }

    function createCard(product, owned) {
      const card = document.createElement('article');
      card.className = 'store-card';
      card.innerHTML = `
        <div class="store-card__media" style="background-image: url('${product.image}')"></div>
        <div class="store-card__content">
          <p class="store-card__eyebrow">Digital</p>
          <h3 class="store-card__title">${product.name}</h3>
          <p class="store-card__price">${formatPrice(product.price)}</p>
        </div>
      `;
      const footer = document.createElement('div');
      footer.className = 'store-card__footer';
      const button = createButton(product, owned);
      if (owned) {
        button.classList.add('store-card__button--owned');
      }
      footer.appendChild(button);
      card.appendChild(footer);
      return card;
    }

    function renderGrid(target) {
      const grid = grids[target];
      if (!grid) return;
      grid.innerHTML = '';
      const items = target === 'owned'
        ? PRODUCTS.filter((product) => purchases.includes(product.id))
        : PRODUCTS;
      items.forEach((product) => {
        const owned = isOwned(product.id);
        grid.appendChild(createCard(product, owned));
      });
    }

    function closeModal() {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      currentProduct = null;
    }

    function updateActionButton(product) {
      if (!modal || !modalPrice) return;
      const modalAction = modal.querySelector('[data-store-modal-action]');
      if (!modalAction) return;
      const owned = isOwned(product.id);
      modalAction.replaceWith(modalAction.cloneNode(true));
      const refreshedButton = modal.querySelector('[data-store-modal-action]');
      if (!refreshedButton) return;
      refreshedButton.className = 'store-button store-button--buy';
      if (owned) {
        refreshedButton.classList.remove('store-button--buy');
        refreshedButton.classList.add('store-button--owned');
        refreshedButton.textContent = 'Disponível';
        modalPrice.textContent = 'Já é seu';
        refreshedButton.addEventListener('click', () => {
          setTab('owned');
          closeModal();
        });
      } else {
        refreshedButton.textContent = 'Comprar';
        modalPrice.textContent = formatPrice(product.price);
        refreshedButton.addEventListener('click', () => {
          const balanceAPI = window.playtalkBalance;
          const currentBalance = balanceAPI && typeof balanceAPI.getBalance === 'function'
            ? balanceAPI.getBalance()
            : 0;
          if (currentBalance < product.price) {
            modalPrice.textContent = 'Saldo insuficiente';
            return;
          }
          const newBalance = Math.max(0, currentBalance - product.price);
          if (balanceAPI && typeof balanceAPI.set === 'function') {
            balanceAPI.set(newBalance);
          }
          purchases = [...new Set([...purchases, product.id])];
          savePurchases(purchases);
          renderGrid('shop');
          renderGrid('owned');
          updateEmptyStates();
          refreshedButton.classList.remove('store-button--buy');
          refreshedButton.classList.add('store-button--owned');
          refreshedButton.textContent = 'Disponível';
          modalPrice.textContent = 'Compra concluída';
          refreshedButton.replaceWith(refreshedButton.cloneNode(true));
          const ownedButton = modal.querySelector('[data-store-modal-action]');
          if (ownedButton) {
            ownedButton.classList.add('store-button--owned');
            ownedButton.textContent = 'Disponível';
            ownedButton.addEventListener('click', () => {
              setTab('owned');
              closeModal();
            });
          }
          setTab('owned');
        });
      }
    }

    function openModal(product) {
      if (!modal || !modalPanel) return;
      currentProduct = product;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      modalPanel.focus({ preventScroll: true });
      if (modalTitle) modalTitle.textContent = product.name;
      if (modalDescription) modalDescription.textContent = product.description;
      if (modalImage) {
        modalImage.style.backgroundImage = `url('${product.image}')`;
      }
      updateActionButton(product);
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        setTab(target);
      });
    });

    [modalClose, modalBackdrop].forEach((el) => {
      if (el) {
        el.addEventListener('click', closeModal);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    });

    renderGrid('shop');
    renderGrid('owned');
    updateEmptyStates();
    setTab('shop');
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-store', initStorePage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initStorePage(), { once: true });
  } else {
    initStorePage();
  }
})();
