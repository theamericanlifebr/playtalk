(function() {
  const PURCHASE_KEY = 'playtalk:store:purchases';
  const PRODUCTS = [
    {
      id: 'skin-neon',
      name: 'Pacote Neon',
      price: 500,
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      description: 'Brilho neon para o seu avatar com molduras dinâmicas e efeitos que destacam cada vitória em todas as telas.'
    },
    {
      id: 'sound-wave',
      name: 'Pacote Sound Wave',
      price: 950,
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
      description: 'Coleção de sons digitais com trilhas suaves e efeitos de celebração para acompanhar seus melhores momentos.'
    },
    {
      id: 'boost-pack',
      name: 'Turbo XP',
      price: 1200,
      image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      description: 'Impulsiona o ritmo de progressão por tempo limitado e celebra cada conquista com partículas especiais.'
    },
    {
      id: 'badge-collection',
      name: 'Coleção de Selos',
      price: 1800,
      image: 'https://images.unsplash.com/photo-1528458876861-7a570b8bb6ae?auto=format&fit=crop&w=800&q=80',
      description: 'Seis selos digitais exclusivos para exibir na sua jornada, cada um inspirado em temas futuristas.'
    },
    {
      id: 'theme-ocean',
      name: 'Tema Oceano',
      price: 2600,
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      description: 'Interface serena com tons de azul e detalhes de espuma que deixam a experiência mais tranquila e imersiva.'
    },
    {
      id: 'theme-cyber',
      name: 'Tema Cyber Grid',
      price: 5000,
      image: 'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=800&q=80',
      description: 'Visual digital com grades luminosas, ícones holográficos e barras de progresso que pulsam em ritmo de jogo.'
    }
  ];

  function getBalanceApi() {
    return window.playtalkBalance;
  }

  function getBalance() {
    const api = getBalanceApi();
    return api && typeof api.getBalance === 'function' ? api.getBalance() : 0;
  }

  function setBalance(value) {
    const api = getBalanceApi();
    if (api && typeof api.set === 'function') {
      api.set(value);
    }
  }

  function formatPrice(value) {
    return `${value.toLocaleString('pt-BR')} moedas`;
  }

  function readPurchases() {
    try {
      const raw = JSON.parse(localStorage.getItem(PURCHASE_KEY) || '[]');
      return new Set(Array.isArray(raw) ? raw : []);
    } catch (error) {
      console.error('Erro ao ler compras salvas', error);
      return new Set();
    }
  }

  function savePurchases(purchases) {
    const payload = Array.from(purchases);
    localStorage.setItem(PURCHASE_KEY, JSON.stringify(payload));
  }

  function createBalanceSection() {
    const section = document.createElement('section');
    section.className = 'balance-section';
    section.setAttribute('aria-live', 'polite');

    const card = document.createElement('div');
    card.className = 'balance-card balance-card--store';
    card.innerHTML = `
      <span class="balance-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img" focusable="false">
          <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v1.18A3 3 0 0 1 22 11v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3H3a1 1 0 0 1 0-2h1v-2H3a1 1 0 0 1 0-2h1Zm2 0v1h12V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1Zm0 6v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1Zm6 3a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2Z"/>
        </svg>
      </span>
      <div class="balance-card__text">
        <span class="balance-card__label">Saldo disponível</span>
        <span class="balance-card__value" data-balance-value>0</span>
      </div>
    `;

    section.appendChild(card);
    return section;
  }

  function createTabNav(onChange, activeTab) {
    const nav = document.createElement('div');
    nav.className = 'store-tab-nav';

    ['store', 'owned'].forEach((tab) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tab = tab;
      button.className = 'store-tab-nav__button';
      button.textContent = tab === 'store' ? 'Loja' : 'Meus produtos';
      if (tab === activeTab) {
        button.classList.add('is-active');
      }
      button.addEventListener('click', () => onChange(tab));
      nav.appendChild(button);
    });

    return nav;
  }

  function createProductCard(product, owned, onOpen) {
    const card = document.createElement('article');
    card.className = 'store-card';

    const image = document.createElement('img');
    image.className = 'store-card__image';
    image.src = product.image;
    image.alt = product.name;
    image.loading = 'lazy';

    const body = document.createElement('div');
    body.className = 'store-card__body';

    const title = document.createElement('h3');
    title.className = 'store-card__title';
    title.textContent = product.name;

    const price = document.createElement('p');
    price.className = 'store-card__price';
    price.textContent = formatPrice(product.price);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'store-card__cta';
    action.textContent = owned ? 'Disponível' : 'Comprar';
    action.classList.toggle('store-card__cta--buy', !owned);
    action.classList.toggle('store-card__cta--owned', owned);

    [image, title, price, action].forEach((element) => {
      element.addEventListener('click', () => onOpen(product));
    });

    body.append(title, price, action);
    card.append(image, body);
    return card;
  }

  function renderGrid(container, products, purchases, onOpen, emptyMessage) {
    container.innerHTML = '';
    if (!products.length) {
      const empty = document.createElement('p');
      empty.className = 'store-empty';
      empty.textContent = emptyMessage;
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'store-grid';

    products.forEach((product) => {
      const owned = purchases.has(product.id);
      grid.appendChild(createProductCard(product, owned, onOpen));
    });

    container.appendChild(grid);
  }

  function openProductModal(options) {
    const { product, purchases, onPurchase, onClose, onOpenOwned } = options;
    const owned = purchases.has(product.id);

    const overlay = document.createElement('div');
    overlay.className = 'store-modal__overlay';

    const modal = document.createElement('div');
    modal.className = 'store-modal';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'store-modal__close';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.textContent = '✕';

    const image = document.createElement('img');
    image.src = product.image;
    image.alt = product.name;
    image.className = 'store-modal__image';
    image.loading = 'lazy';

    const title = document.createElement('h2');
    title.className = 'store-modal__title';
    title.textContent = product.name;

    const description = document.createElement('p');
    description.className = 'store-modal__description';
    description.textContent = product.description.slice(0, 200);

    const price = document.createElement('p');
    price.className = 'store-modal__price';
    price.textContent = owned ? 'Produto já disponível' : formatPrice(product.price);

    const status = document.createElement('p');
    status.className = 'store-modal__status';
    status.hidden = true;

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'store-modal__action';
    action.textContent = owned ? 'Acessar' : 'Comprar';
    action.classList.toggle('store-modal__action--buy', !owned);
    action.classList.toggle('store-modal__action--owned', owned);

    const footer = document.createElement('div');
    footer.className = 'store-modal__footer';

    footer.append(price, status, action);
    modal.append(closeBtn, image, title, description, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function closeModal() {
      overlay.remove();
      if (typeof onClose === 'function') {
        onClose();
      }
    }

    function showStatus(text) {
      status.textContent = text;
      status.hidden = false;
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });

    action.addEventListener('click', () => {
      if (purchases.has(product.id)) {
        closeModal();
        if (typeof onOpenOwned === 'function') {
          onOpenOwned();
        }
        return;
      }

      const currentBalance = getBalance();
      if (currentBalance < product.price) {
        showStatus('Saldo insuficiente para concluir a compra.');
        return;
      }

      const updatedBalance = Math.max(0, currentBalance - product.price);
      setBalance(updatedBalance);
      purchases.add(product.id);
      savePurchases(purchases);
      action.textContent = 'Disponível';
      action.classList.remove('store-modal__action--buy');
      action.classList.add('store-modal__action--owned');
      showStatus('Compra concluída! Produto agora está disponível.');
      price.textContent = 'Produto disponível no seu inventário';

      if (typeof onPurchase === 'function') {
        onPurchase();
      }
    });
  }

  function initStorePage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const container = scope.querySelector('#custom-content');
    if (!container) {
      return;
    }

    const state = {
      activeTab: 'store',
      purchases: readPurchases()
    };

    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'store-header';
    header.innerHTML = `
      <p class="store-header__eyebrow">MOBILE E DESKTOP</p>
      <h1 class="store-header__title">Store</h1>
      <p class="store-header__subtitle">Compre e gerencie produtos digitais com as moedas ganhas nos jogos.</p>
    `;

    const balanceSection = createBalanceSection();

    const tabContainer = document.createElement('div');
    tabContainer.className = 'store-tabs';

    const sectionsWrapper = document.createElement('div');
    sectionsWrapper.className = 'store-sections';

    const storeSection = document.createElement('section');
    storeSection.className = 'store-section';
    storeSection.dataset.tabPanel = 'store';

    const ownedSection = document.createElement('section');
    ownedSection.className = 'store-section';
    ownedSection.dataset.tabPanel = 'owned';

    function switchTab(tab) {
      state.activeTab = tab;
      const buttons = tabContainer.querySelectorAll('.store-tab-nav__button');
      buttons.forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.tab === tab);
      });
      sectionsWrapper.querySelectorAll('.store-section').forEach((section) => {
        section.hidden = section.dataset.tabPanel !== tab;
      });
    }

    function renderSections() {
      renderGrid(
        storeSection,
        PRODUCTS,
        state.purchases,
        (product) => openProductModal({
          product,
          purchases: state.purchases,
          onPurchase: () => {
            renderSections();
            switchTab('owned');
          },
          onClose: () => {},
          onOpenOwned: () => switchTab('owned')
        }),
        'Nada por aqui ainda. A loja será carregada em instantes.'
      );

      const ownedProducts = PRODUCTS.filter((product) => state.purchases.has(product.id));
      renderGrid(
        ownedSection,
        ownedProducts,
        state.purchases,
        (product) => openProductModal({
          product,
          purchases: state.purchases,
          onPurchase: () => {},
          onClose: () => {},
          onOpenOwned: () => switchTab('owned')
        }),
        'Você ainda não tem produtos. Compre algo na loja para começar.'
      );

      switchTab(state.activeTab);
    }

    const tabNav = createTabNav(switchTab, state.activeTab);
    tabContainer.appendChild(tabNav);

    sectionsWrapper.append(storeSection, ownedSection);

    container.append(header, balanceSection, tabContainer, sectionsWrapper);

    renderSections();
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-custom', initStorePage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initStorePage(), { once: true });
  } else {
    initStorePage();
  }
})();
