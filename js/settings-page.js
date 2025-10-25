document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('fun-form');
  if (!form) {
    return;
  }

  const api = window.playtalkSettings;
  const radios = Array.from(form.querySelectorAll('input[name="theme"]'));
  const pointsPerHit = document.getElementById('pointsPerHit');
  const pointsLossPerSecond = document.getElementById('pointsLossPerSecond');
  const startingPoints = document.getElementById('startingPoints');
  const feedback = document.getElementById('fun-feedback');

  function applySettingsToForm(settings) {
    if (!settings) {
      return;
    }
    const theme = settings.theme || 'light';
    radios.forEach(radio => {
      radio.checked = radio.value === theme;
    });
    if (pointsPerHit) {
      pointsPerHit.value = settings.pointsPerHit ?? (api && api.DEFAULT_SETTINGS.pointsPerHit) ?? 0;
    }
    if (pointsLossPerSecond) {
      pointsLossPerSecond.value = settings.pointsLossPerSecond ?? (api && api.DEFAULT_SETTINGS.pointsLossPerSecond) ?? 0;
    }
    if (startingPoints) {
      startingPoints.value = settings.startingPoints ?? (api && api.DEFAULT_SETTINGS.startingPoints) ?? 0;
    }
  }

  function loadSettings() {
    if (!api) {
      applySettingsToForm({});
      return;
    }
    try {
      const settings = api.loadSettings();
      applySettingsToForm(settings);
    } catch (error) {
      console.warn('Não foi possível carregar as configurações salvas.', error);
      applySettingsToForm(api.DEFAULT_SETTINGS);
    }
  }

  function saveSettings(event) {
    event.preventDefault();
    const selectedTheme = (radios.find(radio => radio.checked) || {}).value || 'light';
    const settings = {
      theme: selectedTheme,
      pointsPerHit: Number(pointsPerHit && pointsPerHit.value) || 0,
      pointsLossPerSecond: Number(pointsLossPerSecond && pointsLossPerSecond.value) || 0,
      startingPoints: Number(startingPoints && startingPoints.value) || 0
    };

    if (api) {
      api.saveSettings(settings);
      api.applyTheme(settings.theme);
    }

    if (feedback) {
      feedback.textContent = 'Configurações salvas!';
      window.setTimeout(() => {
        feedback.textContent = '';
      }, 2000);
    }
  }

  loadSettings();

  form.addEventListener('submit', saveSettings);
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked && api && typeof api.applyTheme === 'function') {
        api.applyTheme(radio.value);
      }
    });
  });

  document.addEventListener('playtalk:view-change', event => {
    if (event.detail && event.detail.view === 'settings') {
      loadSettings();
    }
  });
});
