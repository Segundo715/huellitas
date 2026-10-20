// Ráfaga de huellitas y corazones desde un punto de la pantalla (por defecto, el centro superior).
// Solo DOM + CSS: no deja rastro y respeta «reducir movimiento».
const PARTICLES = ['🐾', '🐾', '🐾', '💛', '🧡', '💙'];

export function celebrate(origin?: { x: number; y: number }) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight * 0.3;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'pointer-events-none fixed inset-0 z-[100] overflow-hidden';
  document.body.appendChild(layer);

  for (let i = 0; i < 26; i++) {
    const particle = document.createElement('span');
    const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
    const distance = 90 + Math.random() * 160;
    particle.textContent = PARTICLES[i % PARTICLES.length];
    particle.className = 'paw-burst absolute select-none';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.fontSize = `${14 + Math.random() * 14}px`;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance - 60}px`);
    particle.style.setProperty('--rot', `${(Math.random() - 0.5) * 120}deg`);
    particle.style.animationDelay = `${Math.random() * 90}ms`;
    layer.appendChild(particle);
  }

  window.setTimeout(() => layer.remove(), 1600);
}
