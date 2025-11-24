(function initStorePage() {
  const PURCHASE_STORAGE_KEY = 'playtalk.store.purchases';
  const PRODUCTS = [
    {
      id: 'starter-pack',
      title: 'Starter Pack',
      price: 750,
      image: 'produtos/01.webp',
      eyebrow: 'Pacote virtual',
      description:
        'Um combo básico de boosts visuais para quem está começando. Itens puramente cosméticos, perfeitos para personalizar seu perfil.',
    },
    {
      id: 'focus-kit',
      title: 'Focus Kit',
      price: 1200,
      image: 'produtos/02.webp',
      eyebrow: 'Pacote virtual',
      description:
        'Coleção de fundos e ícones para deixar os treinos com a sua cara. Compra com moedas internas e sem impacto na progressão.',
    },
    {
      id: 'sound-bundle',
      title: 'Sound Bundle',
      price: 950,
      image: 'produtos/03.webp',
      eyebrow: 'Coleção de áudio',
      description:
        'Pacote de toques e efeitos temáticos. É só equipar e aproveitar — nada muda na jogabilidade, só no estilo.',
    },
    {
      id: 'retro-pack',
      title: 'Retro Pack',
      price: 1800,
      image: 'produtos/04.webp',
      eyebrow: 'Visual clássico',
      description:
        'Skins inspiradas nos fliperamas, para quem gosta de nostalgia. Conteúdo cosmético comprado com moedas virtuais.',
    },
    {
      id: 'neon-set',
      title: 'Neon Set',
      price: 2100,
      image: 'produtos/05.webp',
      eyebrow: 'Tema vibrante',
      description:
        'Tema neon com avatares e bordas brilhantes. As compras não interferem nas partidas — servem apenas para personalização.',
    },
    {
      id: 'galaxy-collection',
      title: 'Galaxy Collection',
      price: 2500,
      image: 'produtos/06.webp',
      eyebrow: 'Coleção especial',
      description:
        'Conjunto inspirado no espaço com wallpapers e badges exclusivos. Tudo é cosmético e adquirido com a moeda interna do app.',
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
    price.textContent = formatPrice(product.price);

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
    modalPrice.textContent = formatPrice(product.price);
    modalMessage.textContent = '';

    const owned = purchasedProducts.has(product.id);
    const balance = getBalance();

    if (owned) {
      modalConfirm.textContent = 'Disponível';
      modalConfirm.classList.remove('store-button--buy');
      modalConfirm.classList.add('store-button--owned');
      modalConfirm.disabled = true;
      modalMessage.textContent = 'Você já resgatou este item. Ele é cosmético e não altera o jogo.';
    } else if (balance < product.price) {
      modalConfirm.textContent = 'Saldo insuficiente';
      modalConfirm.classList.add('store-button--buy');
      modalConfirm.classList.remove('store-button--owned');
      modalConfirm.disabled = true;
      modalMessage.textContent = 'Jogue mais rodadas para acumular moedas virtuais e concluir a compra deste item.';
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
    if (balance < selectedProduct.price) {
      modalMessage.textContent = 'Saldo insuficiente para comprar este item.';
      return;
    }

    const updatedBalance = Math.max(0, balance - selectedProduct.price);
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
