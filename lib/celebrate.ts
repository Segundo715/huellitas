// Ráfaga de huellitas y corazones desde un punto de la pantalla (por defecto, el centro superior).
// Solo DOM + CSS: no deja rastro y respeta «reducir movimiento».
// Íconos planos (SVG) en vez de emojis, para que se vean igual en todos los sistemas.
const PAW =
  '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><ellipse cx="5.5" cy="10" rx="2.2" ry="2.8"/><ellipse cx="9.5" cy="5.5" rx="2.2" ry="2.9"/><ellipse cx="14.5" cy="5.5" rx="2.2" ry="2.9"/><ellipse cx="18.5" cy="10" rx="2.2" ry="2.8"/><path d="M12 11c-3.2 0-6 3.4-6 6.2C6 19.4 7.6 21 9.6 21c1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c2 0 3.6-1.6 3.6-3.8 0-2.8-2.8-6.2-6-6.2Z"/></svg>';
const HEART =
  '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/></svg>';
const PARTICLES = [
  { svg: PAW, color: '#0ea5e9' },
  { svg: HEART, color: '#f43f5e' },
  { svg: PAW, color: '#8b5cf6' },
  { svg: HEART, color: '#f59e0b' },
  { svg: PAW, color: '#f97316' },
  { svg: HEART, color: '#ec4899' },
];

export function celebrate(origin?: { x: number; y: number }, count = 26) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight * 0.3;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'pointer-events-none fixed inset-0 z-[100] overflow-hidden';
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const distance = (count < 15 ? 40 : 90) + Math.random() * (count < 15 ? 70 : 160);
    const { svg, color } = PARTICLES[i % PARTICLES.length];
    const size = 14 + Math.random() * 14;
    particle.innerHTML = svg;
    particle.className = 'paw-burst absolute block select-none';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.color = color;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance - 60}px`);
    particle.style.setProperty('--rot', `${(Math.random() - 0.5) * 120}deg`);
    particle.style.animationDelay = `${Math.random() * 90}ms`;
    layer.appendChild(particle);
  }

  window.setTimeout(() => layer.remove(), 1600);
}

/** Ráfaga pequeña desde un elemento (p. ej. el botón «Hecho»). */
export function celebrateFrom(element: Element | null | undefined, count = 12) {
  if (!element) return celebrate(undefined, count);
  const rect = element.getBoundingClientRect();
  celebrate({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, count);
}
