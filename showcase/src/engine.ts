import { useSyncExternalStore } from 'react';
import { createPaket, DEFAULTS, type EffectName, type Preset } from '../../src/core';
import { SCENES, PRESETS } from '../../src/scenes';
import { useShowcase } from './store';
import { HAIRLINE, HAIRLINE_STRONG, INK_MUTED, PAPER_DEEP, SURFACE } from './tokens';

export { SCENES, PRESETS };
export const WORLD = DEFAULTS.world;
const START_X = (WORLD.width - 16) / 2;

/** The one real engine. Its SVG lives in this detached host until the HUD's source panel mounts it. */
export const engineHost = document.createElement('div');
engineHost.className = 'engine-host';

export interface EngineStatus { preset: string | null; effect: EffectName | null; scene: string }
let status: EngineStatus = { preset: null, effect: null, scene: '4' };
const listeners = new Set<() => void>();
const update = (patch: Partial<EngineStatus>) => { status = { ...status, ...patch }; listeners.forEach(l => l()); };

export const paket = createPaket(engineHost, {
  scenes: SCENES,
  scene: SCENES[status.scene],
  start: { x: START_X },
  palette: useShowcase.getState().palette,
  // the source panel sits on the drawing, so its scene uses the sheet's blues
  colors: { bg: PAPER_DEEP, surface: SURFACE, line: HAIRLINE, lineStrong: HAIRLINE_STRONG, muted: INK_MUTED },
  draggable: true,
  // window-wide so arrow keys drive Paket wherever focus is; the engine ignores keys typed into form fields
  keyboard: { target: 'window' },
  onEvent: ev => {
    if (ev.type === 'presetStart') update({ preset: ev.name });
    else if (ev.type === 'presetEnd') update({ preset: null });
    else if (ev.type === 'effectStart' && ev.name !== 'jelly') update({ effect: ev.name });
    else if (ev.type === 'effectEnd') update({ effect: null });
  },
});

useShowcase.subscribe((s, prev) => { if (s.palette !== prev.palette) paket.setPalette(s.palette); });

// number keys switch scenes inside the engine (its listener runs first); read the result back
window.addEventListener('keydown', () => {
  const key = Object.keys(SCENES).find(k => SCENES[k] === paket.getScene());
  if (key && key !== status.scene) update({ scene: key });
});

export function setScene(key: string) { paket.setScene(key); update({ scene: key }); }
export function playPreset(key: string) {
  const p: Preset | undefined = PRESETS[key];
  if (!p) return;
  paket.play(p);
  if (p.scene) update({ scene: p.scene });
}

export function useEngineStatus(): EngineStatus {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => status);
}
