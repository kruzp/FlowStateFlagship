import './style.css';
import { FlowHero } from './flow-engine/app/FlowHero';

// ---------------------------------------------------------------------
// Flow Material — mounted into the hero container only, not the body.
// ---------------------------------------------------------------------

const heroField = document.getElementById('heroField');
const fallback = document.getElementById('fallback');

if (heroField) {
  const hero = new FlowHero(heroField);
  if (hero.isReady) {
    hero.start();
  } else if (fallback) {
    fallback.style.display = 'flex';
  }
}

// ---------------------------------------------------------------------
// Hero HUD — a lightweight, decoupled pointer readout. Purely cosmetic;
// does not feed the simulation (ForceInjector already owns that path).
// ---------------------------------------------------------------------

const hudCoords = document.getElementById('hudCoords');
const hudStatus = document.getElementById('hudStatus');

if (heroField && hudCoords && hudStatus) {
  let idleTimer: number | null = null;

  heroField.addEventListener('pointermove', (event) => {
    const rect = heroField.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    hudCoords.textContent = `${x.toFixed(3)}, ${y.toFixed(3)}`;
    hudStatus.textContent = 'DISTURBED';

    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      hudStatus.textContent = 'STABLE';
    }, 900);
  });
}

// ---------------------------------------------------------------------
// Nav — blurred background once scrolled, mobile menu toggle.
// ---------------------------------------------------------------------

const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');

if (nav) {
  const setScrolled = (): void => {
    nav.dataset.scrolled = window.scrollY > 8 ? 'true' : 'false';
  };
  setScrolled();
  window.addEventListener('scroll', setScrolled, { passive: true });
}

if (nav && navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.dataset.open === 'true';
    nav.dataset.open = isOpen ? 'false' : 'true';
    navToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  nav.querySelectorAll('.nav__mobile a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.dataset.open = 'false';
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---------------------------------------------------------------------
// Scroll reveal — sections and content blocks fade/rise in once.
// ---------------------------------------------------------------------

const revealTargets = document.querySelectorAll(
  '.section__title, .triad__item, .pullquote, .material__body, .specGrid__item, .chipRow, .engineering__principle, .contact__body, .contact__email, .contact__meta',
);

revealTargets.forEach((el) => el.setAttribute('data-reveal', ''));

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );

  revealTargets.forEach((el) => observer.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-visible'));
}
