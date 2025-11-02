(function() {
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    const path = window.location.pathname || '';
    if (!path.includes('livros')) {
      document.body.style.overflow = 'hidden';
      const prevent = e => e.preventDefault();
      document.addEventListener('touchmove', prevent, { passive: false });
      document.addEventListener('wheel', prevent, { passive: false });
    } else {
      document.body.style.overflow = 'auto';
    }
  }
})();
