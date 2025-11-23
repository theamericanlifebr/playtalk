(function () {
  const PRODUCTS = [
    {
      id: 'neon-wallpapers',
      name: 'Pacote Neon',
      price: 1200,
      image:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
      description:
        'Coleção de fundos neon animados para personalizar seus placares e deixar cada vitória com cara futurista, com cores pulsantes e brilho suave em 4K.',
    },
    {
      id: 'focus-kit',
      name: 'Kit Concentração',
      price: 950,
      image:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
      description:
        'Pacote de trilhas sonoras relaxantes e loops suaves para estudar dentro do app, criado para manter o foco sem distrair durante as rodadas.',
    },
    {
      id: 'emoji-pack',
      name: 'Pacote de Reações',
      price: 500,
      image:
        'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=900&q=80',
      description:
        'Reações animadas exclusivas para celebrar vitórias, compartilhar streaks e apoiar amigos com figurinhas que brilham em mensagens rápidas.',
    },
    {
      id: 'badge-pack',
      name: 'Coleção de Badges',
      price: 2400,
      image:
        'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80',
      description:
        'Seis emblemas raros inspirados em missões especiais, perfeitos para exibir na sua jornada e mostrar conquistas lendárias dentro do jogo.',
    },
    {
      id: 'voice-pack',
      name: 'Voz Futurista',
      price: 3200,
      image:
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
      description:
        'Filtro de voz digital para desafios de listening e speaking, com timbres metálicos e eco espacial para deixar cada tentativa ainda mais épica.',
    },
    {
      id: 'booster-pack',
      name: 'Impulso XP',
      price: 5000,
      image:
        'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=900&q=80',
      description:
        'Pacote digital que ativa faíscas de experiência extra em séries perfeitas. Ideal para acelerar níveis e desbloquear recompensas temáticas.',
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
