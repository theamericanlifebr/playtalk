(function() {
  function initFunPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const api = window.playtalkSettings;
    const form = scope.querySelector('#fun-form');
    if (!form) {
      return;
    }
    const retryWrongCheckbox = scope.querySelector('#retryWrongPhrases');
    const headerStartInput = scope.querySelector('#headerColorStart');
    const headerEndInput = scope.querySelector('#headerColorEnd');
    const headerGradientToggle = scope.querySelector('#headerGradientEnabled');
    const phraseColorInput = scope.querySelector('#phraseColor');
    const modeIconColorInput = scope.querySelector('#modeIconColor');
    const modeIconOpacityInput = scope.querySelector('#modeIconOpacity');
    const buttonColorInput = scope.querySelector('#buttonColor');
    const lensColorInputs = Array.from(scope.querySelectorAll('.lens-mode-input[data-lens-mode]'));
    const lensOpacityStrongInput = scope.querySelector('#lensOpacityStrong');
    const lensOpacitySoftInput = scope.querySelector('#lensOpacitySoft');
    const feedback = scope.querySelector('#fun-feedback');
    const backgroundInput = scope.querySelector('#fun-background-upload');
    const backgroundStatus = scope.querySelector('#fun-background-status');
    const backgroundAPI = window.playtalkBackground || null;
    const colorInputs = Array.from(scope.querySelectorAll('.fun-color-input'));
    const palette = scope.querySelector('#lens-color-palette');
    const paletteSwatches = palette ? Array.from(palette.querySelectorAll('[data-color-swatch]')) : [];
    let activeColorInput = colorInputs[0] || null;

    function updateBackgroundStatus(message, isError = false) {
      if (!backgroundStatus) {
        return;
      }
      backgroundStatus.textContent = message || '';
      backgroundStatus.classList.toggle('profile-background__status--error', Boolean(isError));
    }

    async function handleBackgroundUpload(event) {
      if (!backgroundAPI || typeof backgroundAPI.setFromFile !== 'function') {
        updateBackgroundStatus('Não foi possível salvar o plano de fundo.', true);
        return;
      }
      const [file] = event.target.files || [];
      if (!file) {
        updateBackgroundStatus('Selecione um arquivo para continuar.', true);
        return;
      }
      updateBackgroundStatus('Processando fundo...');
      try {
        await backgroundAPI.setFromFile(file);
        updateBackgroundStatus('Plano de fundo aplicado!');
        persistSettings(false);
      } catch (error) {
        updateBackgroundStatus(error && error.message ? error.message : 'Não foi possível salvar o plano de fundo.', true);
      }
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
        retryWrongPhrases: retryWrongCheckbox ? retryWrongCheckbox.checked : false,
        headerGradientStart: headerStartInput ? headerStartInput.value : undefined,
        headerGradientEnd: headerEndInput ? headerEndInput.value : undefined,
        headerGradientEnabled: headerGradientToggle ? headerGradientToggle.checked : true,
        phraseColor: phraseColorInput ? phraseColorInput.value : '',
        modeIconColor: modeIconColorInput ? modeIconColorInput.value : undefined,
        modeIconOpacity: modeIconOpacityInput ? modeIconOpacityInput.value : undefined,
        buttonColor: buttonColorInput ? buttonColorInput.value : undefined,
        lensColor: lensColors['1'] || '',
        lensColors,
        lensOpacityStrong: lensOpacityStrongInput ? lensOpacityStrongInput.value : undefined,
        lensOpacitySoft: lensOpacitySoftInput ? lensOpacitySoftInput.value : undefined
      };
    }

    function load() {
      const settings = api ? api.loadSettings() : {};
      if (retryWrongCheckbox) {
        retryWrongCheckbox.checked = Boolean(settings.retryWrongPhrases);
      }
      if (headerStartInput && settings.headerGradientStart) {
        headerStartInput.value = settings.headerGradientStart;
      }
      if (headerEndInput && settings.headerGradientEnd) {
        headerEndInput.value = settings.headerGradientEnd;
      }
      if (headerGradientToggle) {
        headerGradientToggle.checked = settings.headerGradientEnabled !== false;
      }
      if (phraseColorInput && typeof settings.phraseColor === 'string' && settings.phraseColor.trim()) {
        phraseColorInput.value = settings.phraseColor;
      }
      if (modeIconColorInput && typeof settings.modeIconColor === 'string' && settings.modeIconColor.trim()) {
        modeIconColorInput.value = settings.modeIconColor;
      }
      if (modeIconOpacityInput && Number.isFinite(Number(settings.modeIconOpacity))) {
        modeIconOpacityInput.value = settings.modeIconOpacity;
      }
      if (buttonColorInput && typeof settings.buttonColor === 'string' && settings.buttonColor.trim()) {
        buttonColorInput.value = settings.buttonColor;
      }
      lensColorInputs.forEach(input => {
        const mode = input.dataset.lensMode;
        if (!mode) return;
        const saved = settings.lensColors && settings.lensColors[mode];
        if (typeof saved === 'string' && saved.trim()) {
          input.value = saved;
        }
      });
      if (lensOpacityStrongInput && Number.isFinite(Number(settings.lensOpacityStrong))) {
        lensOpacityStrongInput.value = settings.lensOpacityStrong;
      }
      if (lensOpacitySoftInput && Number.isFinite(Number(settings.lensOpacitySoft))) {
        lensOpacitySoftInput.value = settings.lensOpacitySoft;
      }
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

    function showPalette(input) {
      if (input) {
        activeColorInput = input;
      }
      if (palette) {
        palette.classList.add('fun-color-palette--visible');
      }
    }

    colorInputs.forEach((input) => {
      input.addEventListener('focus', () => showPalette(input));
      input.addEventListener('click', () => showPalette(input));
    });

    paletteSwatches.forEach((button) => {
      button.addEventListener('click', () => {
        if (!activeColorInput) {
          activeColorInput = colorInputs[0] || null;
        }
        if (!activeColorInput) return;
        activeColorInput.value = button.dataset.colorSwatch;
        activeColorInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    if (palette && activeColorInput) {
      palette.classList.add('fun-color-palette--visible');
    }

    load();
    if (form) {
      form.addEventListener('submit', (event) => event.preventDefault());
    }

    [headerStartInput, headerEndInput, headerGradientToggle, phraseColorInput, modeIconColorInput, modeIconOpacityInput, buttonColorInput, lensOpacityStrongInput, lensOpacitySoftInput, ...lensColorInputs].forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => {
        persistSettings();
      });
    });

    if (backgroundAPI && typeof backgroundAPI.applyStoredBackground === 'function') {
      backgroundAPI.applyStoredBackground();
    }
    if (backgroundInput) {
      backgroundInput.addEventListener('change', handleBackgroundUpload);
    }
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-fun', initFunPage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFunPage(), { once: true });
  } else {
    initFunPage();
  }
})();
