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
// Configurator — a small, functional toggle between the three ways to
// start with Flowstate. A second lightweight interactive moment on the
// page, distinct in feel from both the hero and the FAQ accordion below.
// ---------------------------------------------------------------------

const configuratorOptions = document.querySelectorAll<HTMLButtonElement>('.configurator__option');
const configuratorPanel = document.getElementById('configuratorPanel');
const configuratorSecondary = document.getElementById('configuratorSecondary');

if (configuratorPanel && configuratorSecondary && configuratorOptions.length) {
  configuratorOptions.forEach((option) => {
    option.addEventListener('click', () => {
      if (option.classList.contains('is-active')) return;

      configuratorOptions.forEach((other) => {
        other.classList.remove('is-active');
        other.setAttribute('aria-selected', 'false');
      });
      option.classList.add('is-active');
      option.setAttribute('aria-selected', 'true');

      configuratorPanel.classList.add('is-swapping');

      window.setTimeout(() => {
        const price = configuratorPanel.querySelector('.configurator__price');
        const priceSpan = price?.querySelector('span');
        const desc = configuratorPanel.querySelector('.configurator__desc');

        if (price && priceSpan) {
          price.childNodes[0].textContent = option.dataset.price ?? '';
          priceSpan.textContent = option.dataset.period ?? '';
        }
        if (desc) {
          desc.textContent = option.dataset.desc ?? '';
        }

        const secondary = option.dataset.secondary;
        if (secondary) {
          configuratorSecondary.textContent = secondary;
          configuratorSecondary.hidden = false;
        } else {
          configuratorSecondary.hidden = true;
        }

        configuratorPanel.classList.remove('is-swapping');
      }, 150);
    });
  });
}

// ---------------------------------------------------------------------
// FAQ accordion — the second, lighter layer of interaction on the page.
// ---------------------------------------------------------------------

document.querySelectorAll<HTMLButtonElement>('.faqItem__question').forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.closest('.faqItem');
    const isOpen = button.getAttribute('aria-expanded') === 'true';

    document.querySelectorAll<HTMLButtonElement>('.faqItem__question').forEach((other) => {
      if (other !== button) {
        other.setAttribute('aria-expanded', 'false');
        other.closest('.faqItem')?.classList.remove('is-open');
      }
    });

    button.setAttribute('aria-expanded', String(!isOpen));
    item?.classList.toggle('is-open', !isOpen);
  });
});

// ---------------------------------------------------------------------
// Scroll reveal — sections and content blocks fade/rise in once.
// ---------------------------------------------------------------------

const revealTargets = document.querySelectorAll(
  '.section__title, .services__intro, .buildCard, .flow__step, .configurator__toggle, .configurator__panel, .pricing__intro, .priceCard, .pricingDivider, .addonCard, .pricing__footnote, .trustRow__item, .why__principle, .faqLayout__aside, .contact__body, .contact__emailCta, .contact__meta, .faqItem',
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
