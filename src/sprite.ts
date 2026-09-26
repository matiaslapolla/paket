/**
 * Sprite de PAKET·RÍGIDO, dividido en partes.
 * Todo vive en una grilla de 16×16 unidades. Cada parte tiene sus propios
 * frames (listas de píxeles) para poder animarlas y "desarmarlas" por separado.
 */

export interface Palette {
  body: string;   // cuerpo
  shade: string;  // brazos, piernas, base
  visor: string;  // pantalla
  eye: string;    // ojos
  glow: string;   // alerta / highlights
}

export const DEFAULT_PALETTE: Palette = {
  body: '#24c1c7',
  shade: '#0f6d72',
  visor: '#0a0d11',
  eye: '#e6ebef',
  glow: '#7fe3e6',
};

/** Un píxel: x, y, y qué color de la paleta usa. */
export type Px = [number, number, keyof Palette];
export type Frame = Px[];

export type PartName = 'head' | 'torso' | 'armL' | 'armR' | 'legL' | 'legR';
export type EyePose = 'center' | 'up' | 'down' | 'left' | 'right' | 'blink' | 'alert';
export type LegPose = 'stand' | 'walkA' | 'walkB' | 'tuck' | 'spread' | 'crouch';
export type ArmPose = 'down' | 'raise' | 'out' | 'up' | 'bent';

export const SPRITE_W = 16;
export const SPRITE_H = 16;

/* ---------- helpers ---------- */

/** Convierte filas ASCII en píxeles. Las letras se mapean a claves de la paleta. */
function grid(rows: string[], map: Record<string, keyof Palette>, y0 = 0): Frame {
  const out: Frame = [];
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (map[c]) out.push([x, y + y0, map[c]]); }));
  return out;
}
const M = { G: 'body', D: 'shade', V: 'visor', C: 'eye', L: 'glow' } as const;

/** Espeja una parte sobre el eje vertical de la grilla (para el brazo/pierna derecha). */
export function mirror(frame: Frame): Frame {
  return frame.map(([x, y, c]) => [SPRITE_W - 1 - x, y, c]);
}

/* ---------- cabeza (filas 1–7): domo + visor ---------- */

function head(visor: string[]): Frame {
  return grid(['.....GGGGGG.....', '....GGGGGGGG....', '...GGGGGGGGGG...', '...GGGGGGGGGG...', ...visor], M, 1);
}
export const HEAD: Record<EyePose, Frame> = {
  center: head(['...GVVVVVVVVG...', '...GVVCVVVCVG...', '...GVVVVVVVVG...']),
  up:     head(['...GVVCVVVCVG...', '...GVVVVVVVVG...', '...GVVVVVVVVG...']),
  down:   head(['...GVVVVVVVVG...', '...GVVVVVVVVG...', '...GVVCVVVCVG...']),
  left:   head(['...GVVVVVVVVG...', '...GVCVVVCVVG...', '...GVVVVVVVVG...']),
  right:  head(['...GVVVVVVVVG...', '...GVVVCVVVCG...', '...GVVVVVVVVG...']),
  blink:  head(['...GVVVVVVVVG...', '...GVVVVVVVVG...', '...GVVVVVVVVG...']),
  alert:  head(['...GVVVLLVVVG...', '...GVVVLLVVVG...', '...GVVVVLVVVG...']),
};

/* ---------- torso (filas 8–11) ---------- */

export const TORSO: Frame = grid(['...GGGGGGGGGG...', '...GGGGGGGGGG...', '...GGGGGGGGGG...', '...DDDDDDDDDD...'], M, 8);

/* ---------- piernas (filas 12–14), izquierda y derecha ---------- */

const LEGS: Record<LegPose, string[]> = {
  stand:  ['....DD....DD....', '....DD....DD....', '...DDDD..DDDD...'],
  walkA:  ['...DD......DD...', '..DD........DD..', '.DDD.........DD.'],
  walkB:  ['.....DD..DD.....', '.....DD..DD.....', '....DDD..DDD....'],
  tuck:   ['...DD......DD...', '................', '................'],
  spread: ['..DD........DD..', '.DD..........DD.', '................'],
  crouch: ['................', '...DDD....DDD...', '..DDDD....DDDD..'],
};
const half = (f: Frame, left: boolean) => f.filter(([x]) => (left ? x < SPRITE_W / 2 : x >= SPRITE_W / 2));
export const LEG_L = Object.fromEntries(Object.entries(LEGS).map(([k, r]) => [k, half(grid(r, M, 12), true)])) as Record<LegPose, Frame>;
export const LEG_R = Object.fromEntries(Object.entries(LEGS).map(([k, r]) => [k, half(grid(r, M, 12), false)])) as Record<LegPose, Frame>;

/* ---------- brazos: se definen para el izquierdo y se espejan ---------- */

const arm = (px: [number, number][], hand: [number, number][] = []): Frame => [
  ...px.map(([x, y]): Px => [x, y, 'shade']),
  ...hand.map(([x, y]): Px => [x, y, 'body']),
];
export const ARM_L: Record<ArmPose, Frame> = {
  // colgando al costado
  down:  arm([[1, 8], [2, 8], [1, 9], [2, 9], [1, 10], [2, 10]], [[1, 11], [2, 11]]),
  // en diagonal hacia arriba/afuera (balanceo al caminar)
  raise: arm([[2, 8], [1, 7], [2, 7], [1, 6], [0, 6]], [[0, 5], [1, 5]]),
  // extendido horizontal (caída, planeo)
  out:   arm([[2, 8], [1, 8], [2, 9], [1, 9]], [[0, 8], [0, 9]]),
  // levantado (salto, ser agarrado)
  up:    arm([[1, 7], [2, 7], [1, 6], [2, 6], [1, 5], [2, 5]], [[1, 4], [2, 4]]),
  // doblado (agachado)
  bent:  arm([[1, 9], [2, 9], [1, 10], [2, 10]], [[0, 10], [0, 11]]),
};
export const ARM_R = Object.fromEntries(Object.entries(ARM_L).map(([k, f]) => [k, mirror(f)])) as Record<ArmPose, Frame>;

/** Todos los frames de todas las partes, por nombre. */
export const PARTS: Record<PartName, Record<string, Frame>> = {
  head: HEAD,
  torso: { base: TORSO },
  armL: ARM_L,
  armR: ARM_R,
  legL: LEG_L,
  legR: LEG_R,
};
