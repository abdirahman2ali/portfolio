const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const stats = document.querySelector('.stats');
if (stats && !prefersReducedMotion) {
  const counters = stats.querySelectorAll('[data-count]');
  counters.forEach((el) => { el.textContent = '0'; });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      counters.forEach(animateCount);
      observer.disconnect();
    });
  }, { threshold: 0.4 });

  observer.observe(stats);
}

const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.nav-link');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => {
      link.classList.toggle('nav-active', link.getAttribute('href') === `#${entry.target.id}`);
    });
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach((section) => navObserver.observe(section));
