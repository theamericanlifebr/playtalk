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
    const lensColorInputs = Array.from(scope.querySelectorAll('.lens-mode-input[data-lens-mode]'));
    const lensOpacityStrongInput = scope.querySelector('#lensOpacityStrong');
    const lensOpacitySoftInput = scope.querySelector('#lensOpacitySoft');
    const feedback = scope.querySelector('#fun-feedback');
    const backgroundInput = scope.querySelector('#fun-background-upload');
    const backgroundClearButton = scope.querySelector('#fun-background-clear');
    const backgroundStatus = scope.querySelector('#fun-background-status');
    const backgroundAPI = window.playtalkBackground || null;

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
      } catch (error) {
        updateBackgroundStatus(error && error.message ? error.message : 'Não foi possível salvar o plano de fundo.', true);
      }
    }

    function handleBackgroundClear() {
      if (!backgroundAPI || typeof backgroundAPI.clear !== 'function') {
        updateBackgroundStatus('Não foi possível limpar o plano de fundo.', true);
        return;
      }
      backgroundAPI.clear();
      if (backgroundInput) {
        backgroundInput.value = '';
      }
      updateBackgroundStatus('Plano de fundo removido.');
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

    function save(event) {
      event.preventDefault();
      const settings = getFormSettings();
      if (api) {
        api.saveSettings(settings);
        api.applyVisualPreferences(settings);
      }
      if (feedback) {
        feedback.textContent = 'Configurações salvas!';
        setTimeout(() => { feedback.textContent = ''; }, 2000);
      }
    }

    load();
    form.addEventListener('submit', save);

    [headerStartInput, headerEndInput, headerGradientToggle, phraseColorInput, modeIconColorInput, lensOpacityStrongInput, lensOpacitySoftInput, ...lensColorInputs].forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => {
        if (!api) return;
        api.applyVisualPreferences(getFormSettings());
      });
    });

    if (backgroundAPI && typeof backgroundAPI.applyStoredBackground === 'function') {
      backgroundAPI.applyStoredBackground();
    }
    if (backgroundInput) {
      backgroundInput.addEventListener('change', handleBackgroundUpload);
    }
    if (backgroundClearButton) {
      backgroundClearButton.addEventListener('click', handleBackgroundClear);
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
