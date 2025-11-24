(function initStorePage() {
  const PURCHASE_STORAGE_KEY = 'playtalk.store.purchases';
  const PRODUCT_PRICE = 1000;

  const PRODUCTS = [
    {
      id: 'speed-challenge',
      title: 'Speed Challenge',
      image: 'produtos/01.webp',
      eyebrow: 'Modo de jogo',
      description:
        'Mergulhe no modo Speed Challenge para treinar reflexos em inglês com rodadas rápidas, metas claras e feedback imediato. Ideal para dominar vocabulário e manter ritmo intenso em poucos minutos diários.',
    },
    {
      id: 'listening-lab',
      title: 'Listening Lab',
      image: 'produtos/02.webp',
      eyebrow: 'Modo de jogo',
      description:
        'Experimente o Listening Lab com áudios e perguntas contextuais. Adapte a dificuldade, acompanhe transcrições e ganhe confiança para entender conversas em situações sociais, com calma e clareza sempre.',
    },
    {
      id: 'story-mode',
      title: 'Story Mode',
      image: 'produtos/03.webp',
      eyebrow: 'Modo de jogo',
      description:
        'Desbloqueie o Story Mode e avance em capítulos interativos. Decisões pedem frases em inglês, ampliam repertório e entregam recompensas por coerência criatividade e escolhas gramaticais na trama sempre',
    },
    {
      id: 'quiz-relampago',
      title: 'Quiz Relâmpago',
      image: 'produtos/04.webp',
      eyebrow: 'Modo de jogo',
      description:
        'Entre no Quiz Relâmpago e encare sequências de perguntas temáticas. Cronômetro, multiplicadores e combos mantêm adrenalina total ajudando a fixar expressões úteis enquanto disputa o placar com amigos.',
    },
    {
      id: 'pronunciation-pro',
      title: 'Pronunciation Pro',
      image: 'produtos/05.webp',
      eyebrow: 'Modo de jogo',
      description:
        'No Pronunciation Pro você grava frases, recebe notas e dicas fonéticas para acertar ritmo e entonação. A prática é leve, gamificada e perfeita para treinar pronúncia sem pressão direto no seu fone já.',
    },
    {
      id: 'duelo-multiplayer',
      title: 'Duelo Multiplayer',
      image: 'produtos/06.webp',
      eyebrow: 'Modo de jogo',
      description:
        'No Duelo Multiplayer você desafia amigos em rodadas simultâneas, aposta pontos e sobe no ranking em tempo real. Partidas, salas privadas e feed-back instantâneo deixam cada disputa justa e motivadora!',
    },
  ];

  const storeGrid = document.getElementById('store-grid');
  const modal = document.getElementById('store-modal');
  const modalImage = document.getElementById('modal-image');
  const modalEyebrow = document.getElementById('modal-eyebrow');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const modalPrice = document.getElementById('modal-price');
  const modalConfirm = document.getElementById('modal-confirm');
  const modalMessage = document.getElementById('modal-message');

  let selectedProduct = null;

  function getBalance() {
    const balanceAPI = window.playtalkBalance;
    if (!balanceAPI || typeof balanceAPI.getBalance !== 'function') {
      return 0;
    }
    return balanceAPI.getBalance();
  }

  function setBalance(newBalance) {
    const balanceAPI = window.playtalkBalance;
    if (!balanceAPI || typeof balanceAPI.set !== 'function') {
      return;
    }
    balanceAPI.set(newBalance);
  }

  function readPurchases() {
    const raw = localStorage.getItem(PURCHASE_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    } catch (error) {
      console.warn('Não foi possível ler os produtos comprados:', error);
    }
    return new Set();
  }

  function persistPurchases(purchases) {
    const list = Array.from(purchases);
    localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(list));
  }

  let purchasedProducts = readPurchases();

  function formatPrice(value) {
    return `${value.toLocaleString('pt-BR')} pontos`;
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    selectedProduct = null;
    modalMessage.textContent = '';
  }

  function renderButton(button, owned) {
    if (owned) {
      button.textContent = 'Disponível';
      button.classList.remove('store-button--buy');
      button.classList.add('store-button--owned');
      button.disabled = true;
    } else {
      button.textContent = 'Comprar';
      button.classList.add('store-button--buy');
      button.classList.remove('store-button--owned');
      button.disabled = false;
    }
  }

  function renderProductCard(product) {
    const card = document.createElement('article');
    card.className = 'store-card';

    const media = document.createElement('div');
    media.className = 'store-card__media';
    media.style.backgroundImage = `url(${product.image})`;

    const content = document.createElement('div');
    content.className = 'store-card__content';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'store-card__eyebrow';
    eyebrow.textContent = product.eyebrow;

    const title = document.createElement('h3');
    title.className = 'store-card__title';
    title.textContent = product.title;

    const price = document.createElement('p');
    price.className = 'store-card__price';
    price.textContent = formatPrice(PRODUCT_PRICE);

    content.append(eyebrow, title, price);

    const footer = document.createElement('div');
    footer.className = 'store-card__footer';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'store-button store-button--buy';
    button.dataset.productId = product.id;

    const owned = purchasedProducts.has(product.id);
    renderButton(button, owned);

    button.addEventListener('click', () => openModal(product));

    footer.append(button);

    card.append(media, content, footer);
    storeGrid.append(card);
  }

  function renderProducts() {
    if (!storeGrid) return;
    storeGrid.innerHTML = '';
    PRODUCTS.forEach(renderProductCard);
  }

  function openModal(product) {
    selectedProduct = product;
    modalImage.style.backgroundImage = `url(${product.image})`;
    modalEyebrow.textContent = product.eyebrow;
    modalTitle.textContent = product.title;
    modalDescription.textContent = product.description;
    modalPrice.textContent = formatPrice(PRODUCT_PRICE);
    modalMessage.textContent = '';

    const owned = purchasedProducts.has(product.id);
    const balance = getBalance();

    if (owned) {
      modalConfirm.textContent = 'Disponível';
      modalConfirm.classList.remove('store-button--buy');
      modalConfirm.classList.add('store-button--owned');
      modalConfirm.disabled = true;
      modalMessage.textContent = 'Você já liberou este modo.';
    } else if (balance < PRODUCT_PRICE) {
      modalConfirm.textContent = 'Saldo insuficiente';
      modalConfirm.classList.add('store-button--buy');
      modalConfirm.classList.remove('store-button--owned');
      modalConfirm.disabled = true;
      modalMessage.textContent = 'Jogue mais rodadas para acumular pontos e concluir a compra deste modo.';
    } else {
      modalConfirm.textContent = 'Confirmar compra';
      modalConfirm.classList.add('store-button--buy');
      modalConfirm.classList.remove('store-button--owned');
      modalConfirm.disabled = false;
    }

    modal.removeAttribute('hidden');
  }

  function handlePurchaseConfirmation() {
    if (!selectedProduct) return;

    const balance = getBalance();
    if (balance < PRODUCT_PRICE) {
      modalMessage.textContent = 'Saldo insuficiente para comprar este modo.';
      return;
    }

    const updatedBalance = Math.max(0, balance - PRODUCT_PRICE);
    setBalance(updatedBalance);

    purchasedProducts.add(selectedProduct.id);
    persistPurchases(purchasedProducts);

    const button = storeGrid.querySelector(`[data-product-id="${selectedProduct.id}"]`);
    if (button) {
      renderButton(button, true);
    }

    closeModal();
  }

  function handleModalDismiss(event) {
    if (event.target?.dataset?.modalDismiss !== undefined) {
      closeModal();
    }
  }

  function refreshModalAvailability() {
    if (!selectedProduct || modal.hasAttribute('hidden')) return;
    openModal(selectedProduct);
  }

  document.addEventListener('playtalk:balance-change', refreshModalAvailability);

  modalConfirm?.addEventListener('click', handlePurchaseConfirmation);
  modal?.addEventListener('click', handleModalDismiss);

  renderProducts();
})();
