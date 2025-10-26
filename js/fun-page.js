(function() {
  function initFunPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const api = window.playtalkSettings;
    const form = scope.querySelector('#fun-form');
    if (!form) {
      return;
    }
    const radios = Array.from(form.querySelectorAll('input[name="theme"]'));
    const pointsPerHit = scope.querySelector('#pointsPerHit');
    const pointsLossPerSecond = scope.querySelector('#pointsLossPerSecond');
    const startingPoints = scope.querySelector('#startingPoints');
    const feedback = scope.querySelector('#fun-feedback');

    function load() {
      const settings = api ? api.loadSettings() : {};
      const theme = settings.theme || 'light';
      radios.forEach(radio => {
        radio.checked = radio.value === theme;
      });
      if (pointsPerHit) {
        pointsPerHit.value = settings.pointsPerHit ?? (api ? api.DEFAULT_SETTINGS.pointsPerHit : 0);
      }
      if (pointsLossPerSecond) {
        pointsLossPerSecond.value = settings.pointsLossPerSecond ?? (api ? api.DEFAULT_SETTINGS.pointsLossPerSecond : 0);
      }
      if (startingPoints) {
        startingPoints.value = settings.startingPoints ?? (api ? api.DEFAULT_SETTINGS.startingPoints : 0);
      }
    }

    function save(event) {
      event.preventDefault();
      const selected = radios.find(radio => radio.checked);
      const theme = selected ? selected.value : 'light';
      const settings = {
        theme,
        pointsPerHit: pointsPerHit ? Number(pointsPerHit.value) || 0 : 0,
        pointsLossPerSecond: pointsLossPerSecond ? Number(pointsLossPerSecond.value) || 0 : 0,
        startingPoints: startingPoints ? Number(startingPoints.value) || 0 : 0
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
