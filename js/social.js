document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('social-content');
  if (!container) {
    return;
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  function createTable(data, color, columns) {
    const table = document.createElement('table');
    table.className = `ranking-table ${color}`;
    const header = document.createElement('tr');
    header.innerHTML = columns.map(col => `<th>${col.label}</th>`).join('');
    table.appendChild(header);
    data.forEach(item => {
      const row = document.createElement('tr');
      columns.forEach(col => {
        const cell = document.createElement('td');
        cell.textContent = item[col.field];
        row.appendChild(cell);
      });
      table.appendChild(row);
    });
    return table;
  }

  function buildSection(titleText) {
    const section = document.createElement('section');
    const title = document.createElement('h2');
    title.className = 'social-section-title';
    title.textContent = titleText;
    section.appendChild(title);
    return section;
  }

  function renderSocial() {
    container.innerHTML = '';
    const statsData = JSON.parse(localStorage.getItem('modeStats') || '{}');

    const summarySection = buildSection('Resumo dos modos');
    for (let mode = 1; mode <= 6; mode += 1) {
      const stats = statsData[mode] || {};
      const totalTime = stats.totalTime || 0;
      const total = stats.totalPhrases || 0;
      const correct = stats.correct || 0;
      const wrong = stats.wrong || 0;
      const report = stats.report || 0;
      const accuracy = total ? ((correct / total) * 100).toFixed(1) : '0.0';
      const avgTime = total ? formatTime(totalTime / total) : '0s';
      const reportUse = total ? ((report / total) * 100).toFixed(1) : '0.0';
      const card = document.createElement('article');
      card.className = 'social-card';
      card.innerHTML = `
        <header class="social-card__header">
          <img src="selos%20modos%20de%20jogo/modo${mode}.png" alt="Modo ${mode}" width="54" height="54">
          <div>
            <h3>Modo ${mode}</h3>
            <p>${total} frases jogadas</p>
          </div>
        </header>
        <ul class="social-card__list">
          <li><strong>Acertos:</strong> ${correct}</li>
          <li><strong>Erros:</strong> ${wrong}</li>
          <li><strong>Precisão:</strong> ${accuracy}%</li>
          <li><strong>Média por frase:</strong> ${avgTime}</li>
          <li><strong>Reports:</strong> ${reportUse}%</li>
        </ul>
      `;
      summarySection.appendChild(card);
    }
    container.appendChild(summarySection);

    const redRanking = [];
    const limeRanking = [];
    for (let mode = 1; mode <= 6; mode += 1) {
      const stats = statsData[mode] || {};
      if (Array.isArray(stats.wrongRanking)) {
        redRanking.push(...stats.wrongRanking);
      }
      if (Array.isArray(stats.reportRanking)) {
        limeRanking.push(...stats.reportRanking);
      }
    }

    if (redRanking.length) {
      const redSection = buildSection('Expressões que mais geram correção');
      redSection.appendChild(createTable(
        [...redRanking].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 10),
        'red',
        [
          { field: 'expected', label: 'Esperado' },
          { field: 'input', label: 'Entrada' },
          { field: 'folder', label: 'Pasta' },
          { field: 'count', label: 'Erros' }
        ]
      ));
      container.appendChild(redSection);
    }

    if (limeRanking.length) {
      const limeSection = buildSection('Reportes enviados');
      limeSection.appendChild(createTable(
        limeRanking.slice(0, 10),
        'lime',
        [
          { field: 'expected', label: 'Esperado' },
          { field: 'input', label: 'Entrada' },
          { field: 'folder', label: 'Pasta' },
          { field: 'level', label: 'Nível' }
        ]
      ));
      container.appendChild(limeSection);
    }

    const levelDetails = JSON.parse(localStorage.getItem('levelDetails') || '[]');
    if (Array.isArray(levelDetails) && levelDetails.length) {
      const detailsSection = buildSection('Histórico de níveis compartilhados');
      const table = document.createElement('table');
      table.className = 'ranking-table';
      const header = document.createElement('tr');
      header.innerHTML = '<th>Nível</th><th>Precisão</th><th>Velocidade</th><th>Reports</th>';
      table.appendChild(header);
      levelDetails.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${entry.level}</td><td>${entry.accuracy}%</td><td>${entry.speed}%</td><td>${entry.reports}%</td>`;
        table.appendChild(row);
      });
      detailsSection.appendChild(table);
      container.appendChild(detailsSection);
    }
  }

  renderSocial();

  document.addEventListener('playtalk:view-change', event => {
    if (event.detail && event.detail.view === 'social') {
      renderSocial();
    }
  });

  document.addEventListener('playtalk:user-change', renderSocial);
});
