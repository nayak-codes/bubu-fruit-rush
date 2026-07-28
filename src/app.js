/**
 * BUBU FRUIT RUSH - OFFICIAL COMPANY LANDING & WEBSITE CONTROLLER
 */

class LandingController {
  constructor() {
    this.initBackgroundFruits();
    this.initNavScroll();
  }

  // FLOATING BACKGROUND ANIMATION
  initBackgroundFruits() {
    const container = document.getElementById('bgFruits');
    if (!container) return;
    const fruitIcons = ['🍎', '🍌', '🍓', '🍇', '🍊', '⭐', '🧲', '❄️'];
    for (let i = 0; i < 22; i++) {
      const el = document.createElement('div');
      el.className = 'floating-bg-fruit';
      el.textContent = fruitIcons[Math.floor(Math.random() * fruitIcons.length)];
      el.style.left = `${Math.random() * 95}%`;
      el.style.animationDuration = `${12 + Math.random() * 14}s`;
      el.style.animationDelay = `${Math.random() * 10}s`;
      container.appendChild(el);
    }
  }

  // SMOOTH SCROLL NAVIGATION HIGHLIGHTER
  initNavScroll() {
    const navLinks = document.querySelectorAll('.nav-links a.nav-btn');
    const sections = document.querySelectorAll('main section');

    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach((section) => {
        const sectionTop = section.offsetTop - 100;
        if (window.pageYOffset >= sectionTop) {
          current = section.getAttribute('id');
        }
      });

      navLinks.forEach((a) => {
        a.classList.remove('active');
        if (a.getAttribute('href') === `#${current}`) {
          a.classList.add('active');
        }
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.landing = new LandingController();
});
