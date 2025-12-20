(function() {
  const COLOR_PRESETS = [
    '#ef4444', '#f97316', '#f59e0b', '#facc15', '#a3e635', '#22c55e',
    '#16a34a', '#0ea5e9', '#2563eb', '#1d4ed8', '#4338ca', '#7c3aed',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fb7185', '#fca5a5',
    '#fdba74', '#fcd34d', '#bef264', '#86efac', '#34d399', '#14b8a6',
    '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#a5b4fc', '#c084fc',
    '#e879f9', '#f9a8d4', '#e5e7eb', '#d1d5db', '#000000', '#ffffff'
  ];

  const FONT_OPTIONS = [
    'Open Sans',
    'Aver',
    'Bronaco',
    'Colombia',
    'Enceladus',
    'Enceladus Regular',
    'Gealid Light',
    'Gealit',
    'Glametrix',
    'Glametrix Light',
    'Glametrix Feather',
    'Gotama',
    'Hadir Sans',
    'Kimberry',
    'Liscence Plate',
    'Metropolis',
    'Momcake',
    'Momcake Thin',
    'Munich Regular',
    'Newspappe',
    'Tittilum',
    'Titillium Web Semibold',
    'Venus Light',
    'Venus YG'
  ];

  const BACKGROUND_PRESETS = {
    default: { id: 'default', name: 'Background 1 (padrão)', src: 'SVG/background1.svg', type: 'preset' },
    background2: { id: 'background2', name: 'Background 2', src: 'backgrounds/background2.jpg', type: 'preset' },
    background3: { id: 'background3', name: 'Background 3', src: 'backgrounds/background3.jpg', type: 'preset' },
    background4: { id: 'background4', name: 'Background 4', src: 'backgrounds/background4.jpg', type: 'preset' },
    background5: { id: 'background5', name: 'Background 5', src: 'backgrounds/background5.jpg', type: 'preset' },
    background6: { id: 'background6', name: 'Background 6', src: 'backgrounds/background6.jpg', type: 'preset' }
  };

  function normalizeHex(value, fallback = '#ffffff') {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    const isValidHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
    return isValidHex ? trimmed.toLowerCase() : fallback;
  }

  function initFunPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const api = window.playtalkSettings;
    const form = scope.querySelector('#fun-form');
    if (!form) {
      return;
    }

    const headerStartInput = scope.querySelector('#headerColorStart');
    const headerEndInput = scope.querySelector('#headerColorEnd');
    const headerGradientToggle = scope.querySelector('#headerGradientEnabled');
    const appFontSelect = scope.querySelector('#appFontFamily');
    const gameFontSelect = scope.querySelector('#gameFontFamily');
    const appTextColorInput = scope.querySelector('#appTextColor');
    const gamePhraseColorInput = scope.querySelector('#gamePhraseColor');
    const lensColorInputs = Array.from(scope.querySelectorAll('.lens-mode-input[data-lens-mode]'));
    const lensOpacityStrongInput = scope.querySelector('#lensOpacityStrong');
    const lensOpacitySoftInput = scope.querySelector('#lensOpacitySoft');
    const feedback = scope.querySelector('#fun-feedback');
    const backgroundStatus = scope.querySelector('#fun-background-status');
    const backgroundButtons = Array.from(scope.querySelectorAll('.fun-background-card'));
    const backgroundAPI = window.playtalkBackground || null;
    const colorInputs = Array.from(scope.querySelectorAll('.fun-color-input'));
    const colorTriggers = Array.from(scope.querySelectorAll('.fun-color-trigger'));
    const colorBoard = scope.querySelector('#fun-color-board');
    const colorGrid = scope.querySelector('#fun-color-grid');
    const fontPickers = Array.from(scope.querySelectorAll('.fun-font-picker'));
    const fontPanels = Array.from(scope.querySelectorAll('.fun-font-picker__panel'));
    let activeColorInput = colorInputs[0] || null;
    let activeTrigger = colorTriggers[0] || null;

    function updateBackgroundStatus(message, isError = false) {
      if (!backgroundStatus) return;
      backgroundStatus.textContent = message || '';
      backgroundStatus.classList.toggle('profile-background__status--error', Boolean(isError));
    }

    function closeFontPanels() {
      fontPanels.forEach((panel) => {
        panel.hidden = true;
        const trigger = panel.previousElementSibling;
        if (trigger && trigger.classList.contains('fun-font-picker__trigger')) {
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    function setFontTriggerCopy(targetKey, fontName) {
      const triggerText = scope.querySelector(`[data-font-trigger-text="${CSS.escape(targetKey)}"]`);
      if (triggerText) {
        triggerText.textContent = fontName;
        triggerText.style.fontFamily = `'${fontName}', sans-serif`;
      }
    }

    function setFontValue(targetKey, fontName) {
      const targetInput = targetKey === 'app' ? appFontSelect : gameFontSelect;
      if (targetInput) {
        targetInput.value = fontName;
      }
      setFontTriggerCopy(targetKey, fontName);
    }

    function renderFontOptions() {
      fontPickers.forEach((picker) => {
        const targetKey = picker.dataset.fontPicker;
        const optionsContainer = picker.querySelector('[data-font-options]');
        const panel = picker.querySelector('.fun-font-picker__panel');
        if (!targetKey || !optionsContainer || !panel) return;
        const groupName = `font-${targetKey}`;
        optionsContainer.innerHTML = '';
        FONT_OPTIONS.forEach((font) => {
          const label = document.createElement('label');
          label.className = 'label';
          label.style.fontFamily = `'${font}', sans-serif`;
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = groupName;
          input.value = font;
          input.setAttribute('role', 'option');
          const text = document.createElement('span');
          text.className = 'text';
          text.textContent = font;
          label.appendChild(input);
          label.appendChild(text);
          input.addEventListener('change', () => {
            setFontValue(targetKey, font);
            closeFontPanels();
            persistSettings();
          });
          optionsContainer.appendChild(label);
        });

        const trigger = picker.querySelector('.fun-font-picker__trigger');
        if (trigger) {
          trigger.addEventListener('click', () => {
            const isOpen = panel.hidden === false;
            closeFontPanels();
            panel.hidden = isOpen;
            trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            if (!isOpen) {
              panel.hidden = false;
            }
          });
        }
      });

      document.addEventListener('click', (event) => {
        if (!event.target.closest('.fun-font-picker')) {
          closeFontPanels();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeFontPanels();
        }
      });
    }

    function syncTriggerColor(trigger, value) {
      if (!trigger) return;
      trigger.style.setProperty('--color', value || '#ffffff');
    }

    function renderColorGrid() {
      if (!colorGrid) return;
      colorGrid.innerHTML = '';
      COLOR_PRESETS.forEach((color) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'fun-color-palette__swatch fun-color-board__swatch';
        button.dataset.colorSwatch = color;
        button.style.setProperty('--color', color);
        button.setAttribute('aria-label', `Aplicar cor ${color}`);
        button.addEventListener('click', () => applyColor(color));
        colorGrid.appendChild(button);
      });
    }

    function showColorBoard(targetId) {
      const targetInput = targetId ? scope.querySelector(`#${CSS.escape(targetId)}`) : null;
      const targetTrigger = colorTriggers.find((btn) => btn.dataset.colorTarget === targetId) || null;
      if (targetInput) {
        activeColorInput = targetInput;
      }
      if (targetTrigger) {
        activeTrigger = targetTrigger;
      }
      if (colorBoard) {
        colorBoard.classList.add('fun-color-board--visible');
      }
    }

    function hideColorBoard() {
      if (colorBoard) {
        colorBoard.classList.remove('fun-color-board--visible');
      }
    }

    function applyColor(color) {
      if (!activeColorInput) {
        activeColorInput = colorInputs[0] || null;
      }
      if (!activeTrigger) {
        activeTrigger = colorTriggers.find((btn) => btn.dataset.colorTarget === (activeColorInput && activeColorInput.id)) || null;
      }
      if (!activeColorInput) return;
      const normalized = normalizeHex(color, activeColorInput.value || '#ffffff');
      activeColorInput.value = normalized;
      syncTriggerColor(activeTrigger, normalized);
      activeColorInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function getFormSettings() {
      const lensColors = {};
      lensColorInputs.forEach(input => {
        const mode = input.dataset.lensMode;
        if (!mode) return;
        lensColors[mode] = input.value;
      });
      return {
        theme: 'dark',
        headerGradientStart: headerStartInput ? headerStartInput.value : undefined,
        headerGradientEnd: headerEndInput ? headerEndInput.value : undefined,
        headerGradientEnabled: headerGradientToggle ? headerGradientToggle.checked : true,
        appFont: appFontSelect ? appFontSelect.value : undefined,
        gameFont: gameFontSelect ? gameFontSelect.value : undefined,
        appTextColor: appTextColorInput ? appTextColorInput.value : '',
        gamePhraseColor: gamePhraseColorInput ? gamePhraseColorInput.value : '',
        lensColor: lensColors['1'] || '',
        lensColors,
        lensOpacityStrong: lensOpacityStrongInput ? lensOpacityStrongInput.value : undefined,
        lensOpacitySoft: lensOpacitySoftInput ? lensOpacitySoftInput.value : undefined
      };
    }

    function loadBackgroundSelection() {
      if (!backgroundAPI || typeof backgroundAPI.getConfig !== 'function') {
        return 'default';
      }
      const config = backgroundAPI.getConfig();
      if (config && config.presetId && BACKGROUND_PRESETS[config.presetId]) {
        return config.presetId;
      }
      return 'default';
    }

    function markBackgroundCard(activeId) {
      backgroundButtons.forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.backgroundId === activeId);
      });
    }

    function load() {
      const settings = api ? api.loadSettings() : {};
      if (headerStartInput && settings.headerGradientStart) {
        headerStartInput.value = settings.headerGradientStart;
        syncTriggerColor(colorTriggers.find((btn) => btn.dataset.colorTarget === 'headerColorStart'), settings.headerGradientStart);
      }
      if (headerEndInput && settings.headerGradientEnd) {
        headerEndInput.value = settings.headerGradientEnd;
        syncTriggerColor(colorTriggers.find((btn) => btn.dataset.colorTarget === 'headerColorEnd'), settings.headerGradientEnd);
      }
      if (headerGradientToggle) {
        headerGradientToggle.checked = settings.headerGradientEnabled !== false;
      }
      if (appFontSelect) {
        const fontName = settings.appFont || FONT_OPTIONS[0];
        appFontSelect.value = fontName;
        setFontTriggerCopy('app', fontName);
        const appRadio = scope.querySelector(`input[name="font-app"][value="${CSS.escape(fontName)}"]`);
        if (appRadio) appRadio.checked = true;
      }
      if (gameFontSelect) {
        const fontName = settings.gameFont || FONT_OPTIONS[0];
        gameFontSelect.value = fontName;
        setFontTriggerCopy('game', fontName);
        const gameRadio = scope.querySelector(`input[name="font-game"][value="${CSS.escape(fontName)}"]`);
        if (gameRadio) gameRadio.checked = true;
      }
      if (appTextColorInput && settings.appTextColor !== undefined) {
        appTextColorInput.value = settings.appTextColor;
        syncTriggerColor(colorTriggers.find((btn) => btn.dataset.colorTarget === 'appTextColor'), settings.appTextColor || '#ffffff');
      }
      if (gamePhraseColorInput && settings.gamePhraseColor) {
        gamePhraseColorInput.value = settings.gamePhraseColor;
        syncTriggerColor(colorTriggers.find((btn) => btn.dataset.colorTarget === 'gamePhraseColor'), settings.gamePhraseColor);
      }
      lensColorInputs.forEach(input => {
        const mode = input.dataset.lensMode;
        if (!mode) return;
        const saved = settings.lensColors && settings.lensColors[mode];
        if (typeof saved === 'string' && saved.trim()) {
          input.value = saved;
        }
        const trigger = colorTriggers.find((btn) => btn.dataset.colorTarget === `lensColor-${mode}`);
        syncTriggerColor(trigger, input.value);
      });
      if (lensOpacityStrongInput && Number.isFinite(Number(settings.lensOpacityStrong))) {
        lensOpacityStrongInput.value = settings.lensOpacityStrong;
      }
      if (lensOpacitySoftInput && Number.isFinite(Number(settings.lensOpacitySoft))) {
        lensOpacitySoftInput.value = settings.lensOpacitySoft;
      }
      const currentBackgroundId = loadBackgroundSelection();
      markBackgroundCard(currentBackgroundId);
    }

    function persistSettings(showFeedback = true) {
      const settings = getFormSettings();
      if (api) {
        api.saveSettings(settings);
        api.applyVisualPreferences(settings);
      }
      if (feedback) {
        feedback.textContent = showFeedback ? 'Configurações salvas automaticamente' : '';
        if (showFeedback) {
          setTimeout(() => { feedback.textContent = ''; }, 1600);
        }
      }
      return settings;
    }

    colorTriggers.forEach((button) => {
      button.addEventListener('click', () => {
        showColorBoard(button.dataset.colorTarget);
      });
    });

    renderFontOptions();
    renderColorGrid();
    load();

    if (colorBoard) {
      colorBoard.addEventListener('click', (event) => {
        if (event.target.closest('[data-color-dismiss]')) {
          hideColorBoard();
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          hideColorBoard();
        }
      });
    }

    if (form) {
      form.addEventListener('submit', (event) => event.preventDefault());
    }

    [
      headerStartInput,
      headerEndInput,
      headerGradientToggle,
      appTextColorInput,
      gamePhraseColorInput,
      lensOpacityStrongInput,
      lensOpacitySoftInput,
      appFontSelect,
      gameFontSelect,
      ...lensColorInputs
    ].forEach(input => {
      if (!input) return;
      const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventName, () => {
        persistSettings();
      });
    });

    if (backgroundAPI && typeof backgroundAPI.applyStoredBackground === 'function') {
      backgroundAPI.applyStoredBackground();
    }

    backgroundButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const presetId = button.dataset.backgroundId;
        const preset = BACKGROUND_PRESETS[presetId] || BACKGROUND_PRESETS.default;
        if (!backgroundAPI || typeof backgroundAPI.setPreset !== 'function') {
          updateBackgroundStatus('Não foi possível salvar o plano de fundo.', true);
          return;
        }
        backgroundAPI.setPreset(preset);
        markBackgroundCard(presetId);
        updateBackgroundStatus(`${preset.name} aplicado!`);
      });
    });
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-fun', initFunPage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFunPage(), { once: true });
  } else {
    initFunPage();
  }
})();
