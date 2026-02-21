document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.item');
  items.forEach(item => {
    let taps = [];
    item.addEventListener('click', () => {
      const now = Date.now();
      taps = taps.filter(t => now - t < 5000);
      taps.push(now);
      if (taps.length >= 4) {
        showOptions(item);
        taps = [];
      } else {
        item.classList.add('verificado');
      }
    });
  });
});

function showOptions(target) {
  const existing = document.querySelector('.item-options');
  if (existing) existing.remove();
  const box = document.createElement('div');
  box.className = 'item-options';
  const lavar = document.createElement('button');
  lavar.id = 'lavar';
  lavar.textContent = 'Lavar';
  const consertar = document.createElement('button');
  consertar.id = 'consertar';
  consertar.textContent = 'Consertar';
  box.appendChild(lavar);
  box.appendChild(consertar);
  document.body.appendChild(box);
  const rect = target.getBoundingClientRect();
  box.style.top = rect.bottom + 'px';
  box.style.left = rect.left + 'px';
}
