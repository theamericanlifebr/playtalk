(function () {
  const params = new URLSearchParams(window.location.search);
  const shouldEmbed = params.get('embed') === '1';
  const insideFrame = window.self !== window.top;

  if (!shouldEmbed && !insideFrame) {
    return;
  }

  document.documentElement.classList.add('is-embedded');

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('embedded');
    const header = document.getElementById('global-header');
    if (header) {
      header.remove();
    }
    const footer = document.querySelector('.page-footer');
    if (footer) {
      footer.remove();
    }
  });
})();
