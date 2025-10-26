(function() {
  function formatTime(ms) {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}m ${s}s`;
  }

  function createRankingTable(data, modifier, columns) {
    const table = document.createElement('table');
    table.className = `social-stat-table social-stat-table--${modifier}`;

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column.label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach(item => {
      const row = document.createElement('tr');
      columns.forEach(column => {
        const cell = document.createElement('td');
        cell.textContent = item[column.field];
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    return table;
  }

  function createMetric(label, value) {
    const item = document.createElement('li');
    item.className = 'social-stat-metric';
    item.innerHTML = `
      <span class="social-stat-metric__label">${label}</span>
      <span class="social-stat-metric__value">${value}</span>
    `;
    return item;
  }

  function initCustomPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const container = scope.querySelector('#social-stats-content');
    if (!container) {
      return;
    }
    container.innerHTML = '';
    const statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');
    for (let i = 1; i <= 6; i++) {
      const stats = statsData[i] || {};
      const totalTime = stats.totalTime || 0;
      const total = stats.totalPhrases || 0;
      const correct = stats.correct || 0;
      const wrong = stats.wrong || 0;
      const report = stats.report || 0;
      const acc = total ? ((correct / total) * 100).toFixed(2) : '0.00';
      const avg = total ? formatTime(totalTime / total) : '0m 0s';
      const reportPerc = total ? ((report / total) * 100).toFixed(2) : '0.00';

      const card = document.createElement('article');
      card.className = 'social-stat-card';
      card.setAttribute('role', 'listitem');

      const header = document.createElement('header');
      header.className = 'social-stat-card__header';
      header.innerHTML = `
        <h3 class="social-stat-card__title">Modo ${i}</h3>
        <span class="social-stat-card__total">${total} frases</span>
      `;
      card.appendChild(header);

      const metrics = document.createElement('ul');
      metrics.className = 'social-stat-metrics';
      metrics.appendChild(createMetric('Tempo total', formatTime(totalTime)));
      metrics.appendChild(createMetric('Média por frase', avg));
      metrics.appendChild(createMetric('Acertos', `${correct} (${acc}%)`));
      metrics.appendChild(createMetric('Erros', wrong));
      metrics.appendChild(createMetric('Reports', `${report} (${reportPerc}%)`));
      card.appendChild(metrics);

      if (!total) {
        const empty = document.createElement('p');
        empty.className = 'social-stat-card__empty';
        empty.textContent = 'Jogue este modo para começar a registrar dados.';
        card.appendChild(empty);
      }

      const tablesWrapper = document.createElement('div');
      tablesWrapper.className = 'social-stat-card__tables';
      let hasTables = false;
      const red = stats.wrongRanking || [];
      const green = stats.reportRanking || [];
      if (red.length) {
        const redTitle = document.createElement('h4');
        redTitle.textContent = 'Frases mais erradas';
        tablesWrapper.appendChild(redTitle);
        tablesWrapper.appendChild(createRankingTable(red, 'red', [
          { label: 'Frase', field: 'phrase' },
          { label: 'Erros', field: 'count' }
        ]));
        hasTables = true;
      }
      if (green.length) {
        const greenTitle = document.createElement('h4');
        greenTitle.textContent = 'Frases mais reportadas';
        tablesWrapper.appendChild(greenTitle);
        tablesWrapper.appendChild(createRankingTable(green, 'green', [
          { label: 'Frase', field: 'phrase' },
          { label: 'Reports', field: 'count' }
        ]));
        hasTables = true;
      }
      if (hasTables) {
        card.appendChild(tablesWrapper);
      }
      container.appendChild(card);
    }
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-custom', initCustomPage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCustomPage(), { once: true });
  } else {
    initCustomPage();
  }
})();
