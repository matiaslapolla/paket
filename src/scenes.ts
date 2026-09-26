import type { Scene, Preset } from './core';

/* ============================================================
   Escenarios de ejemplo. Una escena es solo { platforms, draw?, tick? }.
   La app puede pasar las suyas por `scenes` / `scene`.
   ============================================================ */

export const SCENES: Record<string, Scene> = {
  '1': {
    name: 'Fábrica',
    platforms: [{ x: 20, y: 112, w: 28 }, { x: 64, y: 98, w: 28 }, { x: 108, y: 84, w: 28 }, { x: 152, y: 70, w: 28 }, { x: 196, y: 56, w: 28 }],
    draw(g, { el, world, palette, colors }) {
      for (let x = 0; x < world.width; x += 16) g.appendChild(el('rect', { x, y: 0, width: 1, height: world.ground, fill: colors.surface }));
      for (let x = 0; x < world.width; x += 4) g.appendChild(el('rect', { x, y: 44, width: 2, height: 1, fill: palette.shade, opacity: 0.6 }));
      this.platforms.forEach((p, i) => {
        g.appendChild(el('rect', { x: p.x, y: p.y, width: p.w, height: 3, fill: palette.body }));
        g.appendChild(el('rect', { x: p.x, y: p.y + 3, width: p.w, height: 1, fill: palette.shade }));
        const t = el('text', { x: p.x + 2, y: p.y - 3, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 5, fill: colors.muted });
        t.textContent = '0' + (i + 1); g.appendChild(t);
      });
    },
  },
  '2': {
    name: 'Terminal',
    platforms: [{ x: 40, y: 104, w: 40 }, { x: 140, y: 96, w: 24 }, { x: 190, y: 80, w: 40 }],
    draw(g, { el, world, palette, colors }) {
      const lines: [number, number, number][] = [[8, 20, 60], [8, 28, 110], [8, 36, 40], [8, 52, 90], [8, 60, 30], [150, 20, 70], [150, 28, 40], [150, 36, 90]];
      lines.forEach(([x, y, w]) => g.appendChild(el('rect', { x, y, width: w, height: 2, fill: colors.line })));
      lines.forEach(([x, y]) => g.appendChild(el('rect', { x: x - 4, y, width: 2, height: 2, fill: palette.shade })));
      this.platforms.forEach(p => {
        g.appendChild(el('rect', { x: p.x, y: p.y, width: 2, height: 8, fill: palette.body }));
        g.appendChild(el('rect', { x: p.x + p.w - 2, y: p.y, width: 2, height: 8, fill: palette.body }));
        g.appendChild(el('rect', { x: p.x, y: p.y, width: p.w, height: 2, fill: palette.body }));
      });
      const c = el('text', { x: 8, y: world.ground + 10, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 6, fill: palette.body });
      c.textContent = '$ evals run paket'; g.appendChild(c);
    },
  },
  '3': {
    name: 'Servidor',
    platforms: [{ x: 24, y: 96, w: 32 }, { x: 88, y: 72, w: 32 }, { x: 152, y: 96, w: 32 }, { x: 216, y: 72, w: 32 }],
    draw(g, { el, world, palette, colors }) {
      this.platforms.forEach((p, i) => {
        g.appendChild(el('rect', { x: p.x, y: p.y, width: p.w, height: world.ground - p.y, fill: colors.surface, stroke: colors.line, 'stroke-width': 1 }));
        for (let y = p.y + 6; y < world.ground - 4; y += 8) {
          g.appendChild(el('rect', { x: p.x + 4, y, width: p.w - 8, height: 1, fill: colors.line }));
          const led = el('rect', { x: p.x + p.w - 8, y: y - 1, width: 2, height: 2, fill: palette.body, 'data-led': (i * 3 + y) % 7 });
          g.appendChild(led);
        }
      });
    },
    tick(g, t) {
      g.querySelectorAll<SVGRectElement>('[data-led]').forEach(l => {
        const on = ((+l.dataset.led! + Math.floor(t * 2)) % 7) < 4;
        l.setAttribute('opacity', on ? '1' : '0.15');
      });
    },
    tickEvery: 0.5,
  },
  '4': {
    name: 'Vacío',
    platforms: [],
    draw(g, { el, world, colors }) { for (let x = 0; x < world.width; x += 8) g.appendChild(el('rect', { x, y: world.ground - 24, width: 4, height: 1, fill: colors.line })); },
  },
};

/* ============================================================
   Presets: secuencias de "teclas" con duración. Usan la misma
   física que el control manual; agregar uno es escribir una lista.
   ============================================================ */

const hold = (ms: number, keys: Preset['steps'][number]['keys'] = {}, eyes?: Preset['steps'][number]['eyes']) => ({ ms, keys, eyes });
const jump = (ms: number, keys: Preset['steps'][number]['keys'] = {}) => ({ ms, keys: { ...keys, jump: true } });

export const PRESETS: Record<string, Preset> = {
  patrol: { name: 'Patrulla', steps: [hold(2200, { right: true }), hold(500), hold(2200, { left: true }), hold(500)], loop: 2 },
  tripleJump: { name: 'Triple salto', steps: [hold(300, { right: true, run: true }), jump(50, { right: true, run: true }), hold(650, { right: true, run: true }), jump(50, { right: true, run: true }), hold(650, { right: true, run: true }), jump(50, { right: true, run: true }), hold(700, { right: true, run: true })] },
  doubleJump: { name: 'Doble salto', steps: [hold(200, { right: true }), jump(50, { right: true }), hold(280, { right: true }), jump(50, { right: true }), hold(900, { right: true }), hold(300)] },
  climb: {
    name: 'Subir estaciones', scene: '1', reset: true,
    steps: [hold(900, { right: true }), jump(50, { right: true }), hold(650, { right: true }), jump(50, { right: true }), hold(650, { right: true }), jump(50, { right: true }), hold(650, { right: true }), jump(50, { right: true }), hold(650, { right: true }), jump(50, { right: true }), hold(500, { right: true }), hold(800)],
  },
  nightShift: { name: 'Turno nocturno', steps: [hold(900), hold(700, {}, 'left'), hold(500), hold(700, {}, 'right'), hold(400), hold(200, {}, 'alert'), hold(150), hold(200, {}, 'alert'), jump(60), hold(800)] },
  reboot: { name: 'Reinicio', steps: [{ ms: 100, effect: 'glitch' }, hold(400)] },
};
