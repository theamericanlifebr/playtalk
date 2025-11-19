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
    const feedback = scope.querySelector('#fun-feedback');

    function load() {
      const settings = api ? api.loadSettings() : {};
      const theme = settings.theme || 'light';
      radios.forEach(radio => {
        radio.checked = radio.value === theme;
      });
      if (retryWrongCheckbox) {
        retryWrongCheckbox.checked = Boolean(settings.retryWrongPhrases);
      }
    }

    function save(event) {
      event.preventDefault();
      const selected = radios.find(radio => radio.checked);
      const theme = selected ? selected.value : 'light';
      const settings = {
        theme,
        retryWrongPhrases: retryWrongCheckbox ? retryWrongCheckbox.checked : false
      };
      if (api) {
        api.saveSettings(settings);
        api.applyTheme(settings.theme);
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
          api.applyTheme(radio.value);
        }
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
