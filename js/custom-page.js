(function() {
  function formatTime(ms) {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}m ${s}s`;
  }

  function createRankingTable(data, color, columns) {
    const table = document.createElement('table');
    table.className = `ranking-table ${color}`;
    const header = document.createElement('tr');
    header.innerHTML = columns.map(c => `<th>${c.label}</th>`).join('');
    table.appendChild(header);
    data.forEach(item => {
      const row = document.createElement('tr');
      columns.forEach(c => {
        const td = document.createElement('td');
        td.textContent = item[c.field];
        row.appendChild(td);
      });
      table.appendChild(row);
    });
    return table;
  }

  function initCustomPage(context = {}) {
    const scope = context && context.container ? context.container : document;
    const container = scope.querySelector('#custom-content');
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
      const acc = total ? ((correct / total) * 100).toFixed(2) : '0';
      const avg = total ? formatTime(totalTime / total) : '0s';
      const reportPerc = total ? ((report / total) * 100).toFixed(2) : '0';
      const section = document.createElement('div');
      section.innerHTML = `
        <h1 class="custom-title">Modo ${i} - Resultados</h1>
        <div class="custom-info">Frases totais: ${total}</div>
        <div class="custom-info">Tempo de jogo: ${formatTime(totalTime)}</div>
        <div class="custom-info">Frases acertadas: ${correct}</div>
        <div class="custom-info">Frases erradas: ${wrong}</div>
        <div class="custom-info">Porcentagem de acertos: ${acc}%</div>
        <div class="custom-info">Média de tempo por frase: ${avg}</div>
        <div class="custom-info">Uso de reportar: ${reportPerc}%</div>
      `;
      const red = stats.wrongRanking || [];
      const green = stats.reportRanking || [];
      if (red.length) {
        const redTitle = document.createElement('h2');
        redTitle.className = 'custom-subtitle custom-subtitle--red';
        redTitle.textContent = 'Frases mais erradas';
        section.appendChild(redTitle);
        section.appendChild(createRankingTable(red, 'red', [
          { label: 'Frase', field: 'phrase' },
          { label: 'Erros', field: 'count' }
        ]));
      }
      if (green.length) {
        const greenTitle = document.createElement('h2');
        greenTitle.className = 'custom-subtitle custom-subtitle--green';
        greenTitle.textContent = 'Frases mais reportadas';
        section.appendChild(greenTitle);
        section.appendChild(createRankingTable(green, 'green', [
          { label: 'Frase', field: 'phrase' },
          { label: 'Reports', field: 'count' }
        ]));
      }
      container.appendChild(section);
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
