document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  if (!form) {
    return;
  }

  const api = window.playtalkSettings || null;
  const radios = Array.from(form.querySelectorAll('input[name="theme"]'));
  const pointsPerHit = document.getElementById('pointsPerHit');
  const pointsLossPerSecond = document.getElementById('pointsLossPerSecond');
  const startingPoints = document.getElementById('startingPoints');
  const feedback = document.getElementById('fun-feedback');

  function applyTheme(theme) {
    if (api && typeof api.applyTheme === 'function') {
      api.applyTheme(theme);
    }
  }

  function loadSettings() {
    const settings = api && typeof api.loadSettings === 'function'
      ? api.loadSettings()
      : {};
    const theme = settings.theme || 'light';
    radios.forEach(radio => {
      radio.checked = radio.value === theme;
    });
    if (pointsPerHit) {
      const fallback = api && api.DEFAULT_SETTINGS ? api.DEFAULT_SETTINGS.pointsPerHit : 0;
      pointsPerHit.value = settings.pointsPerHit ?? fallback ?? 0;
    }
    if (pointsLossPerSecond) {
      const fallback = api && api.DEFAULT_SETTINGS ? api.DEFAULT_SETTINGS.pointsLossPerSecond : 0;
      pointsLossPerSecond.value = settings.pointsLossPerSecond ?? fallback ?? 0;
    }
    if (startingPoints) {
      const fallback = api && api.DEFAULT_SETTINGS ? api.DEFAULT_SETTINGS.startingPoints : 0;
      startingPoints.value = settings.startingPoints ?? fallback ?? 0;
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const selectedRadio = radios.find(radio => radio.checked);
    const theme = selectedRadio ? selectedRadio.value : 'light';
    const settings = {
      theme,
      pointsPerHit: Number(pointsPerHit?.value) || 0,
      pointsLossPerSecond: Number(pointsLossPerSecond?.value) || 0,
      startingPoints: Number(startingPoints?.value) || 0
    };
    if (api && typeof api.saveSettings === 'function') {
      api.saveSettings(settings);
    }
    applyTheme(settings.theme);
    if (feedback) {
      feedback.textContent = 'Configurações salvas!';
      setTimeout(() => {
        feedback.textContent = '';
      }, 2000);
    }
  }

  form.addEventListener('submit', handleSubmit);
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        applyTheme(radio.value);
      }
    });
  });

  loadSettings();

  document.addEventListener('playtalk:view-change', event => {
    if (event.detail && event.detail.view === 'settings') {
      loadSettings();
    }
  });
});
