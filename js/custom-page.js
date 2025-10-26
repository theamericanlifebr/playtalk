(function() {
  function formatTime(ms) {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}m ${s}s`;
  }

  function createRankingTable({ data, modifier, columns, title }) {
    const wrapper = document.createElement('div');
    wrapper.className = `social-stats__table-wrapper social-stats__table--${modifier}`;
    const heading = document.createElement('p');
    heading.className = 'social-stats__table-title';
    heading.textContent = title;
    const table = document.createElement('table');
    table.className = 'social-stats__table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(column => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = column.label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    const tbody = document.createElement('tbody');
    data.forEach(item => {
      const row = document.createElement('tr');
      columns.forEach(column => {
        const td = document.createElement('td');
        td.textContent = item[column.field];
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    wrapper.appendChild(heading);
    wrapper.appendChild(table);
    return wrapper;
  }

  function initCustomPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const grid = scope.querySelector('#social-stats-grid');
    if (!grid) {
      return;
    }
    const emptyState = scope.querySelector('#social-stats-empty');
    grid.innerHTML = '';
    if (emptyState) {
      emptyState.hidden = true;
    }
    const statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');
    let hasContent = false;
    for (let i = 1; i <= 6; i++) {
      const stats = statsData[i] || {};
      const totalTime = stats.totalTime || 0;
      const total = stats.totalPhrases || 0;
      const correct = stats.correct || 0;
      const wrong = stats.wrong || 0;
      const report = stats.report || 0;
      const acc = total ? ((correct / total) * 100).toFixed(2) : '0';
      const avg = total ? formatTime(totalTime / total) : '0s';
      const reportPerc = total ? ((report / total) * 100).toFixed(2) : '0';
      const card = document.createElement('article');
      card.className = 'social-stats__card';
      card.setAttribute('role', 'listitem');

      const header = document.createElement('header');
      header.className = 'social-stats__card-header';
      const title = document.createElement('h3');
      title.className = 'social-stats__card-title';
      title.textContent = `Modo ${i}`;
      const subtitle = document.createElement('p');
      subtitle.className = 'social-stats__card-subtitle';
      subtitle.textContent = 'Resultados recentes';
      header.appendChild(title);
      header.appendChild(subtitle);
      card.appendChild(header);

      const metrics = document.createElement('dl');
      metrics.className = 'social-stats__metrics';

      function appendMetric(label, value) {
        const wrapper = document.createElement('div');
        wrapper.className = 'social-stats__metric';
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        wrapper.appendChild(dt);
        wrapper.appendChild(dd);
        metrics.appendChild(wrapper);
      }

      appendMetric('Frases totais', total);
      appendMetric('Tempo de jogo', formatTime(totalTime));
      appendMetric('Frases acertadas', correct);
      appendMetric('Frases erradas', wrong);
      appendMetric('Precisão', `${acc}%`);
      appendMetric('Tempo médio', avg);
      appendMetric('Report', `${reportPerc}%`);

      card.appendChild(metrics);

      if (total || totalTime || correct || wrong || report) {
        hasContent = true;
      }
      const red = stats.wrongRanking || [];
      const green = stats.reportRanking || [];
      if (red.length) {
        card.appendChild(createRankingTable({
          data: red,
          modifier: 'red',
          title: 'Frases mais erradas',
          columns: [
            { label: 'Frase', field: 'phrase' },
            { label: 'Erros', field: 'count' }
          ]
        }));
      }
      if (green.length) {
        card.appendChild(createRankingTable({
          data: green,
          modifier: 'green',
          title: 'Frases mais reportadas',
          columns: [
            { label: 'Frase', field: 'phrase' },
            { label: 'Reports', field: 'count' }
          ]
        }));
      }
      grid.appendChild(card);
    }
    if (!hasContent) {
      grid.innerHTML = '';
      if (emptyState) {
        emptyState.hidden = false;
      }
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
