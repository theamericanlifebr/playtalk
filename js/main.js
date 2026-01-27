document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.menu-mode--disabled').forEach((item) => {
    item.setAttribute('aria-disabled', 'true');
  });
});
