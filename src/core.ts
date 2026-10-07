/**
 * PAKET core — motor sin dependencias. Framework-agnostic.
 *
 *   const paket = createPaket(hostElement, { scene: SCENES.factory, draggable: true });
 *   paket.play(PRESETS.patrol);
 *   paket.effect('blackhole');
 *   paket.destroy();
 *
 * Todo lo configurable está en PaketOptions. Los defaults viven en DEFAULTS.
 */
import { DEFAULT_PALETTE, PARTS, SPRITE_W, SPRITE_H, type Palette, type PartName, type Frame, type EyePose, type LegPose, type ArmPose } from './sprite';

/* ============================================================
   Tipos públicos
   ============================================================ */

export interface World { width: number; height: number; ground: number }
export interface Platform { x: number; y: number; w: number }

export interface SceneContext { el: typeof el; world: World; palette: Palette; colors: SceneColors }
export interface SceneColors { bg: string; surface: string; line: string; lineStrong: string; muted: string }
export interface Scene {
  name: string;
  platforms: Platform[];
  /** Dibuja la decoración detrás del personaje. Recibe el <g> vacío. */
  draw?: (g: SVGGElement, ctx: SceneContext) => void;
  /** Se llama cada `tickEvery` s con el tiempo; para LEDs, parpadeos, etc. */
  tick?: (g: SVGGElement, t: number) => void;
  tickEvery?: number;
}

export interface Physics {
  walk: number; run: number; accel: number;
  jump: number; doubleJump: number; maxJumps: number; gravity: number;
  /** velocidad de lanzamiento al soltar el drag: multiplicador y tope */
  throwScale: number; maxThrow: number; bounce: number;
}
export interface Jelly { stiffness: number; damping: number; land: number; jump: number; poke: number; drop: number }
export interface Timings { disassemble: number; blackhole: number; glitch: number; blinkEvery: number; walkFps: number; runFps: number }

export type KeyName = 'left' | 'right' | 'jump' | 'down' | 'run';
export interface KeyboardOptions {
  /** 'host' escucha solo con el host enfocado (embebible); 'window' escucha globalmente. */
  target?: 'host' | 'window';
  map?: Record<string, KeyName>;
  /** teclas extra: escenario por número, Escape corta preset */
  extras?: boolean;
}

export type EffectName = 'disassemble' | 'blackhole' | 'jelly' | 'glitch' | 'reset';
export type StateName = 'idle' | 'walk' | 'crouch' | 'jump' | 'fall' | 'held' | 'effect';

/** Un paso de preset: mantener estas "teclas" durante ms, opcionalmente forzando la mirada. */
export interface PresetStep { ms: number; keys?: Partial<Record<KeyName, boolean>>; eyes?: EyePose; effect?: EffectName }
export interface Preset { name: string; steps: PresetStep[]; loop?: number; scene?: string; reset?: boolean }

export interface PaketOptions {
  palette?: Partial<Palette>;
  colors?: Partial<SceneColors>;
  world?: Partial<World>;
  physics?: Partial<Physics>;
  jelly?: Partial<Jelly>;
  timings?: Partial<Timings>;
  scene?: Scene;
  scenes?: Record<string, Scene>;
  draggable?: boolean;
  keyboard?: boolean | KeyboardOptions;
  /** posición inicial */
  start?: { x?: number; y?: number; facing?: 1 | -1 };
  /** true: parpadeo ambiental y ticks de escenario apagados */
  reducedMotion?: boolean;
  /** clic sin arrastrar = "poke" con efecto gelatina */
  pokeOnClick?: boolean;
  onState?: (state: PaketState) => void;
  onEvent?: (ev: PaketEvent) => void;
}

export interface PaketState {
  x: number; y: number; vx: number; vy: number; facing: 1 | -1;
  state: StateName; onGround: boolean; jumpsUsed: number;
  preset: string | null; effect: EffectName | null;
}
/** What the last render drew, so other renderers (canvas, WebGL) can mirror the engine. Sprite units, degrees. */
export interface PartPose { frame: string; dx: number; dy: number; rot: number }
export interface PaketPose {
  parts: Record<PartName, PartPose>;
  x: number; y: number; facing: 1 | -1;
  /** squash and stretch, applied from the feet */
  sx: number; sy: number;
  /** global rotation (blackhole + double-jump spin) around the sprite centre */
  rot: number; scale: number; opacity: number;
}
export type PaketEvent =
  | { type: 'jump'; double: boolean } | { type: 'land'; impact: number } | { type: 'grab' } | { type: 'drop'; vx: number; vy: number }
  | { type: 'poke' } | { type: 'presetStart'; name: string } | { type: 'presetEnd'; name: string }
  | { type: 'effectStart'; name: EffectName } | { type: 'effectEnd'; name: EffectName };

export interface PaketController {
  readonly svg: SVGSVGElement;
  setInput(keys: Partial<Record<KeyName, boolean>>): void;
  press(key: KeyName): void;
  release(key: KeyName): void;
  jump(): void;
  face(dir: 1 | -1): void;
  teleport(x: number, y?: number): void;
  setScene(scene: Scene | string): void;
  getScene(): Scene;
  play(preset: Preset): void;
  stop(): void;
  effect(name: EffectName): void;
  setPalette(p: Partial<Palette>): void;
  setDraggable(on: boolean): void;
  getState(): PaketState;
  getPose(): PaketPose;
  destroy(): void;
}

/* ============================================================
   Defaults
   ============================================================ */

export const DEFAULTS = {
  world: { width: 256, height: 144, ground: 128 } as World,
  colors: { bg: '#0d0f13', surface: '#12161c', line: '#1f2630', lineStrong: '#2b3440', muted: '#8b96a3' } as SceneColors,
  physics: { walk: 38, run: 64, accel: 12, jump: -118, doubleJump: -100, maxJumps: 2, gravity: 330, throwScale: 1, maxThrow: 220, bounce: 0.25 } as Physics,
  jelly: { stiffness: 140, damping: 9, land: -2.2, jump: 1.6, poke: 3, drop: -2.5 } as Jelly,
  timings: { disassemble: 2.6, blackhole: 2.0, glitch: 1.35, blinkEvery: 4.2, walkFps: 6, runFps: 9 } as Timings,
  keys: { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump', ArrowDown: 'down', s: 'down', Shift: 'run' } as Record<string, KeyName>,
};

/* ============================================================
   Utilidades SVG
   ============================================================ */

const NS = 'http://www.w3.org/2000/svg';
export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  return n;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t ** 2;

/* ============================================================
   Partes renderizadas
   ============================================================ */

interface PartNode {
  g: SVGGElement;                 // grupo de la parte (recibe transform de efectos)
  frames: Record<string, SVGGElement>;
  frameColors: Record<string, SVGRectElement[][]>; // por frame, rects por clave de paleta — para setPalette
  current: string;
  bbox: { minX: number; minY: number; maxX: number; maxY: number; cx: number; cy: number };
  // estado para efectos (desarme / agujero negro)
  fx: { dx: number; dy: number; vx: number; vy: number; rot: number; vrot: number; rest: number; grounded: boolean; scale: number; op: number };
}

function buildPart(name: PartName, palette: Palette): PartNode {
  const g = el('g', { 'data-part': name });
  const frames: Record<string, SVGGElement> = {};
  const frameColors: Record<string, SVGRectElement[][]> = {};
  const bb = { minX: 99, minY: 99, maxX: -1, maxY: -1, cx: 0, cy: 0 };
  for (const [fname, frame] of Object.entries(PARTS[name])) {
    const fg = el('g'); fg.style.display = 'none';
    const byColor: Record<string, SVGRectElement[]> = {};
    for (const [x, y, c] of frame as Frame) {
      const r = el('rect', { x, y, width: 1, height: 1, fill: palette[c] });
      (byColor[c] ??= []).push(r); fg.appendChild(r);
      bb.minX = Math.min(bb.minX, x); bb.maxX = Math.max(bb.maxX, x); bb.minY = Math.min(bb.minY, y); bb.maxY = Math.max(bb.maxY, y);
    }
    frames[fname] = fg; frameColors[fname] = Object.entries(byColor).map(([, v]) => v);
    (frameColors[fname] as any).keys = Object.keys(byColor);
    g.appendChild(fg);
  }
  bb.cx = (bb.minX + bb.maxX + 1) / 2; bb.cy = (bb.minY + bb.maxY + 1) / 2;
  return { g, frames, frameColors, current: '', bbox: bb, fx: { dx: 0, dy: 0, vx: 0, vy: 0, rot: 0, vrot: 0, rest: 0, grounded: false, scale: 1, op: 1 } };
}

/* ============================================================
   createPaket
   ============================================================ */

export function createPaket(host: HTMLElement, opts: PaketOptions = {}): PaketController {
  const world: World = { ...DEFAULTS.world, ...opts.world };
  const colors: SceneColors = { ...DEFAULTS.colors, ...opts.colors };
  const physics: Physics = { ...DEFAULTS.physics, ...opts.physics };
  const jellyCfg: Jelly = { ...DEFAULTS.jelly, ...opts.jelly };
  const timings: Timings = { ...DEFAULTS.timings, ...opts.timings };
  let palette: Palette = { ...DEFAULT_PALETTE, ...opts.palette };
  const scenes: Record<string, Scene> = { ...(opts.scenes ?? {}) };
  const reduced = opts.reducedMotion ?? (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---- DOM ---- */
  const svg = el('svg', { viewBox: `0 0 ${world.width} ${world.height}`, xmlns: NS });
  svg.style.display = 'block'; svg.style.width = '100%'; svg.style.height = 'auto';
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.style.touchAction = 'none';
  const bgRect = el('rect', { width: world.width, height: world.height, fill: colors.bg });
  const sceneG = el('g', { 'data-layer': 'scene' });
  const charG = el('g', { 'data-layer': 'char' });
  const shadow = el('rect', { x: 3, y: SPRITE_H, width: 10, height: 1, fill: '#000', opacity: 0.45 });
  const hit = el('rect', { x: 0, y: 0, width: SPRITE_W, height: SPRITE_H, fill: 'transparent' });
  hit.style.cursor = 'grab';
  svg.append(bgRect, sceneG, charG);
  charG.appendChild(shadow);
  const parts = Object.fromEntries((['legL', 'legR', 'armL', 'armR', 'torso', 'head'] as PartName[]).map(n => [n, buildPart(n, palette)])) as Record<PartName, PartNode>;
  for (const n of ['legL', 'legR', 'armL', 'armR', 'torso', 'head'] as PartName[]) charG.appendChild(parts[n].g);
  charG.appendChild(hit);
  host.appendChild(svg);

  /* ---- estado ---- */
  const P = {
    x: opts.start?.x ?? 24, y: opts.start?.y ?? world.ground, vx: 0, vy: 0,
    facing: (opts.start?.facing ?? 1) as 1 | -1, onGround: true, jumpsUsed: 0,
    state: 'idle' as StateName, t: 0,
    spin: 0, spinV: 0,               // giro del doble salto (grados)
    jelly: { s: 0, v: 0 },           // resorte: s>0 = estirado, s<0 = aplastado
    scale: 1, rot: 0, opacity: 1,    // transform global (agujero negro)
  };
  const input: Record<KeyName, boolean> & { jumpEdge: boolean } = { left: false, right: false, jump: false, down: false, run: false, jumpEdge: false };
  let eyesOverride: EyePose | null = null;
  let scene: Scene = opts.scene ?? Object.values(scenes)[0] ?? { name: 'empty', platforms: [] };
  let preset: { def: Preset; i: number; left: number; loops: number } | null = null;
  let effect: { name: EffectName; t: number; dur: number } | null = null;
  let drag: { id: number; ox: number; oy: number; samples: { x: number; y: number; t: number }[]; moved: boolean } | null = null;
  let draggable = opts.draggable ?? true;
  let destroyed = false;

  const emit = (ev: PaketEvent) => opts.onEvent?.(ev);

  /* ---- escena ---- */
  function setScene(s: Scene | string) {
    const next = typeof s === 'string' ? scenes[s] : s;
    if (!next) return;
    scene = next; sceneG.replaceChildren();
    sceneG.appendChild(el('rect', { x: 0, y: world.ground, width: world.width, height: world.height - world.ground, fill: colors.surface }));
    sceneG.appendChild(el('rect', { x: 0, y: world.ground, width: world.width, height: 1, fill: colors.lineStrong }));
    scene.draw?.(sceneG, { el, world, palette, colors });
    if (P.y > world.ground) { P.y = world.ground; P.vy = 0; }
  }

  /* ---- física ---- */
  function landingY(x: number, y: number, vy: number, dt: number): number | null {
    let best: number | null = null;
    for (const s of scene.platforms) {
      const within = x + 11 > s.x && x + 5 < s.x + s.w;
      if (within && vy >= 0 && y <= s.y + 0.01 && y + vy * dt >= s.y - 0.01) best = best === null ? s.y : Math.min(best, s.y);
    }
    if (vy >= 0 && y <= world.ground && y + vy * dt >= world.ground) best = best === null ? world.ground : Math.min(best, world.ground);
    return best;
  }
  function standingOn(x: number, y: number) {
    if (Math.abs(y - world.ground) < 0.5) return true;
    return scene.platforms.some(s => x + 11 > s.x && x + 5 < s.x + s.w && Math.abs(y - s.y) < 0.5);
  }
  function doJump() {
    if (P.jumpsUsed >= physics.maxJumps || input.down) return;
    const double = !P.onGround;
    P.vy = double ? physics.doubleJump : physics.jump;
    P.onGround = false; P.jumpsUsed++;
    P.jelly.v += jellyCfg.jump;
    if (double) { P.spinV = 900 * P.facing; }
    emit({ type: 'jump', double });
  }
  function land(y: number) {
    const impact = P.vy;
    P.y = y; P.vy = 0;
    if (!P.onGround) { P.jelly.v += jellyCfg.land * clamp(impact / 120, 0.3, 1.6); emit({ type: 'land', impact }); }
    P.onGround = true; P.jumpsUsed = 0; P.spin = 0; P.spinV = 0;
  }

  function step(dt: number) {
    const locked = !!effect || P.state === 'held';
    if (!locked) {
      const speed = input.run ? physics.run : physics.walk;
      let target = 0;
      if (input.left && !input.right) { target = -speed; P.facing = -1; }
      if (input.right && !input.left) { target = speed; P.facing = 1; }
      if (input.down && P.onGround) target = 0;
      P.vx += (target - P.vx) * Math.min(1, physics.accel * dt);
      if (input.jumpEdge) doJump();
      input.jumpEdge = false;

      P.vy += physics.gravity * dt;
      const ly = landingY(P.x, P.y, P.vy, dt);
      P.x = clamp(P.x + P.vx * dt, -4, world.width - 12);
      P.y += P.vy * dt;
      if (ly !== null) land(ly);
      else if (P.y > world.ground) land(world.ground);
      else if (P.onGround && !standingOn(P.x, P.y)) P.onGround = false;

      // rebote lateral en los bordes cuando viene lanzado
      if ((P.x <= -4 && P.vx < 0) || (P.x >= world.width - 12 && P.vx > 0)) P.vx = -P.vx * physics.bounce;
    }
    // giro del doble salto
    if (P.spinV) { P.spin += P.spinV * dt; if (Math.abs(P.spin) >= 360) { P.spin = 0; P.spinV = 0; } }
    // resorte gelatina
    const j = P.jelly; const a = -jellyCfg.stiffness * j.s - jellyCfg.damping * j.v;
    j.v += a * dt; j.s += j.v * dt;

    // máquina de estados
    P.t += dt;
    let next: StateName;
    if (effect) next = 'effect';
    else if (drag) next = 'held';
    else if (!P.onGround) next = P.vy < 0 ? 'jump' : 'fall';
    else if (input.down) next = 'crouch';
    else if (Math.abs(P.vx) > 6) next = 'walk';
    else next = 'idle';
    if (next !== P.state) { P.state = next; P.t = 0; opts.onState?.(getState()); }
  }

  /* ---- poses por estado ---- */
  function poses(): { eyes: EyePose; legs: LegPose; armL: ArmPose; armR: ArmPose } {
    const walkI = Math.floor(P.t * (input.run ? timings.runFps : timings.walkFps)) % 4;
    switch (P.state) {
      case 'jump': return { eyes: 'up', legs: 'tuck', armL: 'up', armR: 'up' };
      case 'fall': return { eyes: 'down', legs: 'spread', armL: 'out', armR: 'out' };
      case 'held': return { eyes: 'down', legs: 'spread', armL: 'up', armR: 'up' };
      case 'crouch': return { eyes: eyesOverride ?? 'center', legs: 'crouch', armL: 'bent', armR: 'bent' };
      case 'walk': return {
        eyes: eyesOverride ?? 'center',
        legs: (['walkA', 'stand', 'walkB', 'stand'] as LegPose[])[walkI],
        armL: walkI === 0 ? 'raise' : 'down', armR: walkI === 2 ? 'raise' : 'down',
      };
      case 'effect': return { eyes: eyesOverride ?? (effect?.name === 'glitch' ? 'alert' : 'center'), legs: 'stand', armL: 'down', armR: 'down' };
      default: {
        const c = P.t % timings.blinkEvery;
        const blink = !reduced && c > timings.blinkEvery - 0.3 && c < timings.blinkEvery - 0.15;
        return { eyes: eyesOverride ?? (blink ? 'blink' : 'center'), legs: 'stand', armL: 'down', armR: 'down' };
      }
    }
  }
  function show(part: PartNode, frame: string) {
    if (part.current === frame) return;
    if (part.current) part.frames[part.current].style.display = 'none';
    part.frames[frame].style.display = ''; part.current = frame;
  }

  /* ---- efectos ---- */
  function startEffect(name: EffectName) {
    if (name === 'reset') { stopEffect(); P.x = opts.start?.x ?? 24; P.y = world.ground; P.vx = P.vy = 0; P.facing = 1; P.jelly.v = jellyCfg.poke; return; }
    if (name === 'jelly') { P.jelly.v += jellyCfg.poke; emit({ type: 'effectStart', name }); return; }
    stopEffect(); endDrag(false);
    const dur = name === 'disassemble' ? timings.disassemble : name === 'blackhole' ? timings.blackhole : timings.glitch;
    effect = { name, t: 0, dur };
    for (const k of ['left', 'right', 'down', 'run'] as KeyName[]) input[k] = false;
    P.vx = 0;
    if (name === 'disassemble') {
      for (const [n, p] of Object.entries(parts) as [PartName, PartNode][]) {
        const f = p.fx;
        const dir = n.endsWith('L') ? -1 : n.endsWith('R') ? 1 : (Math.random() < 0.5 ? -1 : 1);
        f.dx = 0; f.dy = 0; f.rot = 0; f.grounded = false;
        f.vx = dir * (20 + Math.random() * 30); f.vy = -60 - Math.random() * 60; f.vrot = dir * (200 + Math.random() * 300);
        // altura a la que "toca el piso" (relativa al sprite; la base del sprite está en world.ground)
        f.rest = world.ground - P.y + SPRITE_H - 1 - (p.bbox.maxY + 1);
      }
    }
    emit({ type: 'effectStart', name });
  }
  function stopEffect() {
    if (!effect) return;
    const name = effect.name; effect = null;
    for (const p of Object.values(parts)) { p.fx.dx = p.fx.dy = p.fx.rot = 0; p.fx.scale = 1; p.fx.op = 1; p.g.setAttribute('transform', ''); p.g.style.opacity = ''; }
    P.scale = 1; P.rot = 0; P.opacity = 1; eyesOverride = null;
    emit({ type: 'effectEnd', name });
  }
  function runEffect(dt: number) {
    if (!effect) return;
    effect.t += dt;
    const { name, t, dur } = effect;
    if (name === 'disassemble') {
      const fly = dur - 0.7;           // hasta acá caen y rebotan; después vuelven a su lugar
      for (const p of Object.values(parts)) {
        const f = p.fx;
        if (t < fly) {
          if (!f.grounded) {
            f.vy += physics.gravity * dt; f.dx += f.vx * dt; f.dy += f.vy * dt; f.rot += f.vrot * dt;
            if (f.dy >= f.rest) { f.dy = f.rest; f.vy = -f.vy * 0.35; f.vx *= 0.6; f.vrot *= 0.4; if (Math.abs(f.vy) < 12) { f.grounded = true; f.vy = 0; f.rot = Math.round(f.rot / 90) * 90; } }
          }
        } else {
          const k = easeOut((t - fly) / 0.7);
          if (!('back' in f)) { (f as any).back = { dx: f.dx, dy: f.dy, rot: f.rot }; }
          const b = (f as any).back; f.dx = lerp(b.dx, 0, k); f.dy = lerp(b.dy, 0, k); f.rot = lerp(b.rot, 0, k);
        }
      }
      if (t >= dur) { for (const p of Object.values(parts)) delete (p.fx as any).back; stopEffect(); P.jelly.v += jellyCfg.poke; }
    } else if (name === 'blackhole') {
      const inT = 1.1, gap = 0.4, outT = dur - inT - gap;
      if (t < inT) {
        const k = t / inT;
        P.scale = (1 - k) ** 1.4; P.rot = easeIn(k) * 900; P.opacity = 1 - k * 0.5;
        Object.values(parts).forEach((p, i) => { p.fx.rot = k * 360 * (i % 2 ? 1 : -1); p.fx.dx = Math.cos(k * 8 + i) * k * 4; p.fx.dy = Math.sin(k * 8 + i) * k * 4 - k * 6; });
      } else if (t < inT + gap) {
        P.scale = 0; P.opacity = 0;
        // reaparece en otro lugar del suelo
        if (t - dt < inT) { P.x = clamp(P.x + (Math.random() - 0.5) * 120, 8, world.width - 24); P.y = world.ground; P.vy = 0; P.onGround = true; }
      } else if (t < dur) {
        const k = easeOut((t - inT - gap) / outT);
        P.scale = k; P.rot = (1 - k) * -360; P.opacity = k;
        Object.values(parts).forEach(p => { p.fx.rot = 0; p.fx.dx = 0; p.fx.dy = 0; });
      } else { stopEffect(); P.jelly.v += jellyCfg.poke; }
    } else if (name === 'glitch') {
      if (t < 0.9) { eyesOverride = Math.random() < 0.5 ? 'alert' : 'center'; P.opacity = Math.random() < 0.6 ? 1 : 0.15; P.x = clamp(P.x + (Math.random() - 0.5) * 3, 0, world.width - 16); }
      else if (t < 1.3) { P.opacity = 0; }
      else { stopEffect(); P.x = opts.start?.x ?? 24; P.y = world.ground; P.vy = 0; P.facing = 1; P.jelly.v += jellyCfg.poke; }
    }
  }

  /* ---- render ---- */
  let pose: PaketPose;
  function render() {
    const po = poses();
    show(parts.head, po.eyes); show(parts.torso, 'base');
    show(parts.legL, po.legs); show(parts.legR, po.legs); show(parts.armL, po.armL); show(parts.armR, po.armR);

    const sy = (P.state === 'crouch' ? 0.82 : 1) * (1 + P.jelly.s);
    const sx = 1 / Math.sqrt(Math.max(0.2, sy));
    pose = {
      parts: Object.fromEntries((Object.entries(parts) as [PartName, PartNode][]).map(([n, p]) => [n, { frame: p.current, dx: p.fx.dx, dy: p.fx.dy, rot: p.fx.rot }])) as Record<PartName, PartPose>,
      x: P.x, y: P.y, facing: P.facing, sx, sy, rot: P.rot + P.spin, scale: P.scale, opacity: P.opacity,
    };
    const px = Math.round(P.x), py = Math.round(P.y);
    // Orden: ir al centro del sprite → giro global → bajar a los pies → flip + gelatina (escalan desde los pies) → sprite.
    charG.setAttribute('transform',
      `translate(${px + 8} ${py - 8}) rotate(${(P.rot + P.spin).toFixed(1)}) translate(0 8) scale(${(P.facing * sx * P.scale).toFixed(3)} ${(sy * P.scale).toFixed(3)}) translate(-8 -15)`);
    charG.style.opacity = String(P.opacity);
    for (const p of Object.values(parts)) {
      const f = p.fx;
      if (f.dx || f.dy || f.rot) p.g.setAttribute('transform', `translate(${f.dx.toFixed(2)} ${f.dy.toFixed(2)}) rotate(${f.rot.toFixed(1)} ${p.bbox.cx} ${p.bbox.cy})`);
      else if (p.g.hasAttribute('transform')) p.g.removeAttribute('transform');
    }
    const h = Math.max(0, world.ground - P.y);
    const w = Math.max(4, 10 - h / 12);
    shadow.setAttribute('opacity', String(Math.max(0, 0.45 - h / 160) * P.opacity));
    shadow.setAttribute('width', String(w)); shadow.setAttribute('x', String(3 + (10 - w) / 2));
    shadow.setAttribute('transform', `translate(0 ${h})`);
  }

  /* ---- presets ---- */
  function play(def: Preset) {
    stop();
    if (def.scene && scenes[def.scene]) setScene(def.scene);
    if (def.reset) { P.x = 4; P.y = world.ground; P.vx = P.vy = 0; P.facing = 1; }
    preset = { def, i: 0, left: def.steps[0].ms, loops: (def.loop ?? 1) - 1 };
    applyStep(def.steps[0]);
    emit({ type: 'presetStart', name: def.name });
  }
  function applyStep(s: PresetStep) {
    for (const k of ['left', 'right', 'down', 'run'] as KeyName[]) input[k] = !!s.keys?.[k];
    if (s.keys?.jump) input.jumpEdge = true;
    eyesOverride = s.eyes ?? null;
    if (s.effect) startEffect(s.effect);
  }
  function stop() {
    if (!preset) return;
    const name = preset.def.name; preset = null; eyesOverride = null;
    for (const k of ['left', 'right', 'down', 'run'] as KeyName[]) input[k] = false;
    emit({ type: 'presetEnd', name });
  }
  function runPreset(dt: number) {
    if (!preset) return;
    if (effect) return; // espera a que termine el efecto del paso
    preset.left -= dt * 1000;
    if (preset.left > 0) return;
    preset.i++;
    if (preset.i >= preset.def.steps.length) {
      if (preset.loops-- > 0) preset.i = 0; else { stop(); return; }
    }
    const s = preset.def.steps[preset.i]; preset.left = s.ms; applyStep(s);
  }

  /* ---- drag ---- */
  function toWorld(ev: PointerEvent) {
    const ctm = svg.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }
  function onDown(ev: PointerEvent) {
    if (!draggable || effect) return;
    ev.preventDefault();
    stop();
    const w = toWorld(ev);
    drag = { id: ev.pointerId, ox: w.x - P.x, oy: w.y - P.y, samples: [{ x: w.x, y: w.y, t: performance.now() }], moved: false };
    hit.setPointerCapture(ev.pointerId); hit.style.cursor = 'grabbing';
    P.vx = P.vy = 0; P.onGround = false; P.jumpsUsed = physics.maxJumps;
    for (const k of ['left', 'right', 'down', 'run'] as KeyName[]) input[k] = false;
    emit({ type: 'grab' });
  }
  function onMove(ev: PointerEvent) {
    if (!drag || ev.pointerId !== drag.id) return;
    const w = toWorld(ev);
    const nx = clamp(w.x - drag.ox, -4, world.width - 12), ny = clamp(w.y - drag.oy, 8, world.ground);
    if (Math.abs(nx - P.x) + Math.abs(ny - P.y) > 0.5) drag.moved = true;
    if (nx - P.x > 0.3) P.facing = 1; else if (nx - P.x < -0.3) P.facing = -1;
    P.x = nx; P.y = ny;
    drag.samples.push({ x: w.x, y: w.y, t: performance.now() }); if (drag.samples.length > 6) drag.samples.shift();
  }
  function onUp(ev: PointerEvent) { if (drag && ev.pointerId === drag.id) endDrag(true); }
  function endDrag(throwIt: boolean) {
    if (!drag) return;
    const d = drag; drag = null; hit.style.cursor = 'grab';
    if (!d.moved) { P.onGround = standingOn(P.x, P.y); if (P.onGround) P.jumpsUsed = 0; if (opts.pokeOnClick ?? true) { P.jelly.v += jellyCfg.poke; emit({ type: 'poke' }); } return; }
    let vx = 0, vy = 0;
    const a = d.samples[0], b = d.samples[d.samples.length - 1];
    if (throwIt && b.t > a.t) { const s = 1000 / (b.t - a.t); vx = (b.x - a.x) * s * physics.throwScale; vy = (b.y - a.y) * s * physics.throwScale; }
    const m = Math.hypot(vx, vy); if (m > physics.maxThrow) { vx *= physics.maxThrow / m; vy *= physics.maxThrow / m; }
    P.vx = vx; P.vy = vy; P.onGround = false; P.jumpsUsed = physics.maxJumps - 1;
    if (standingOn(P.x, P.y) && vy >= 0) { P.onGround = true; P.jumpsUsed = 0; P.vy = 0; P.jelly.v += jellyCfg.drop; }
    emit({ type: 'drop', vx, vy });
  }
  hit.addEventListener('pointerdown', onDown);
  hit.addEventListener('pointermove', onMove);
  hit.addEventListener('pointerup', onUp);
  hit.addEventListener('pointercancel', onUp);

  /* ---- teclado ---- */
  const kb: KeyboardOptions | null = opts.keyboard === false ? null : (opts.keyboard === true || opts.keyboard === undefined ? {} : opts.keyboard);
  const keymap = kb?.map ?? DEFAULTS.keys;
  const kbTarget: EventTarget | null = kb ? (kb.target === 'window' ? window : host) : null;
  if (kb && kb.target !== 'window' && !host.hasAttribute('tabindex')) host.setAttribute('tabindex', '0');
  const onKeyDown = (e: Event) => {
    const ev = e as KeyboardEvent;
    if (kb?.target === 'window' && (ev.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
    if (kb?.extras !== false) {
      if (ev.key === 'Escape') { stop(); return; }
      const sc = scenes[ev.key]; if (sc) { setScene(sc); return; }
    }
    const k = keymap[ev.key]; if (!k) return;
    ev.preventDefault();
    if (preset) stop();
    if (k === 'jump') { if (!input.jump) input.jumpEdge = true; input.jump = true; } else input[k] = true;
  };
  const onKeyUp = (e: Event) => { const k = keymap[(e as KeyboardEvent).key]; if (k) input[k] = false; };
  const onBlur = () => { for (const k of ['left', 'right', 'jump', 'down', 'run'] as KeyName[]) input[k] = false; };
  if (kbTarget) { kbTarget.addEventListener('keydown', onKeyDown); kbTarget.addEventListener('keyup', onKeyUp); window.addEventListener('blur', onBlur); }

  /* ---- loop ---- */
  let last = performance.now(), tickAcc = 0, raf = 0;
  function loop(now: number) {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    runPreset(dt); runEffect(dt); step(dt); render();
    if (!reduced && scene.tick) { tickAcc += dt; if (tickAcc >= (scene.tickEvery ?? 0.5)) { tickAcc = 0; scene.tick(sceneG, now / 1000); } }
    raf = requestAnimationFrame(loop);
  }

  /* ---- API ---- */
  function getState(): PaketState {
    return { x: P.x, y: P.y, vx: P.vx, vy: P.vy, facing: P.facing, state: P.state, onGround: P.onGround, jumpsUsed: P.jumpsUsed, preset: preset?.def.name ?? null, effect: effect?.name ?? null };
  }
  const api: PaketController = {
    svg,
    setInput(keys) { for (const [k, v] of Object.entries(keys)) { if (k === 'jump' && v && !input.jump) input.jumpEdge = true; (input as any)[k] = !!v; } },
    press(k) { api.setInput({ [k]: true }); },
    release(k) { api.setInput({ [k]: false }); },
    jump() { input.jumpEdge = true; },
    face(d) { P.facing = d; },
    teleport(x, y) { P.x = x; P.y = y ?? world.ground; P.vx = P.vy = 0; P.onGround = standingOn(P.x, P.y); },
    setScene, getScene: () => scene, play, stop,
    effect: startEffect,
    setPalette(p) {
      palette = { ...palette, ...p };
      for (const n of Object.keys(parts) as PartName[]) {
        for (const [fname, groups] of Object.entries(parts[n].frameColors)) {
          const keys: (keyof Palette)[] = (groups as any).keys;
          groups.forEach((rects, i) => rects.forEach(r => r.setAttribute('fill', palette[keys[i]])));
        }
      }
    },
    setDraggable(on) { draggable = on; hit.style.cursor = on ? 'grab' : 'default'; },
    getState,
    getPose: () => pose,
    destroy() {
      destroyed = true; cancelAnimationFrame(raf);
      if (kbTarget) { kbTarget.removeEventListener('keydown', onKeyDown); kbTarget.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); }
      svg.remove();
    },
  };

  setScene(scene);
  render();
  raf = requestAnimationFrame(loop);
  return api;
}
