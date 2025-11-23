(function() {
  function initFunPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const api = window.playtalkSettings;
    const form = scope.querySelector('#fun-form');
    if (!form) {
      return;
    }
    const radios = Array.from(form.querySelectorAll('input[name="theme"]'));
    const retryWrongCheckbox = scope.querySelector('#retryWrongPhrases');
    const headerStartInput = scope.querySelector('#headerColorStart');
    const headerEndInput = scope.querySelector('#headerColorEnd');
    const headerGradientToggle = scope.querySelector('#headerGradientEnabled');
    const phraseColorInput = scope.querySelector('#phraseColor');
    const lensColorInput = scope.querySelector('#lensColor');
    const feedback = scope.querySelector('#fun-feedback');

    function getFormSettings() {
      const selected = radios.find(radio => radio.checked);
      return {
        theme: selected ? selected.value : 'light',
        retryWrongPhrases: retryWrongCheckbox ? retryWrongCheckbox.checked : false,
        headerGradientStart: headerStartInput ? headerStartInput.value : undefined,
        headerGradientEnd: headerEndInput ? headerEndInput.value : undefined,
        headerGradientEnabled: headerGradientToggle ? headerGradientToggle.checked : true,
        phraseColor: phraseColorInput ? phraseColorInput.value : '',
        lensColor: lensColorInput ? lensColorInput.value : ''
      };
    }

    function load() {
      const settings = api ? api.loadSettings() : {};
      const theme = settings.theme || 'light';
      radios.forEach(radio => {
        radio.checked = radio.value === theme;
      });
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
      if (lensColorInput && typeof settings.lensColor === 'string' && settings.lensColor.trim()) {
        lensColorInput.value = settings.lensColor;
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
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked && api) {
          const settings = getFormSettings();
          settings.theme = radio.value;
          api.applyVisualPreferences(settings);
        }
      });
    });

    [headerStartInput, headerEndInput, headerGradientToggle, phraseColorInput, lensColorInput].forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => {
        if (!api) return;
        api.applyVisualPreferences(getFormSettings());
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
