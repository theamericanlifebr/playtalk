(function() {
  function buildLetterElements(label) {
    const container = document.createElement('span');
    container.className = 'playtalk-button__letters';
    container.setAttribute('aria-hidden', 'true');
    label.split('').forEach((char, index) => {
      const letter = document.createElement('i');
      letter.className = 'playtalk-button__letter';
      letter.style.setProperty('--letter-index', String(index + 1));
      letter.textContent = char === ' ' ? '\u00a0' : char;
      container.appendChild(letter);
    });
    return container;
  }

  function enhanceButton(button) {
    if (!button || button.dataset.playtalkReady) {
      return;
    }
    const rawLabel = (button.dataset.label || button.textContent || '').trim();
    if (!rawLabel) {
      return;
    }
    button.dataset.label = rawLabel;

    const existingLetters = button.querySelector('.playtalk-button__letters');
    if (existingLetters) {
      existingLetters.remove();
    }
    const letters = buildLetterElements(rawLabel);
    const icon = button.querySelector('.playtalk-button__icon');
    if (icon) {
      button.insertBefore(letters, icon);
    } else {
      button.appendChild(letters);
    }

    if (!button.querySelector('.playtalk-button__sr')) {
      const srText = document.createElement('span');
      srText.className = 'playtalk-button__sr';
      srText.textContent = rawLabel;
      button.appendChild(srText);
    }

    button.dataset.playtalkReady = 'true';
  }

  function enhanceAllButtons() {
    const buttons = document.querySelectorAll('.playtalk-button');
    buttons.forEach(enhanceButton);
  }

  document.addEventListener('DOMContentLoaded', enhanceAllButtons, { once: true });
  document.addEventListener('playtalk:buttons-refresh', enhanceAllButtons);
})();
