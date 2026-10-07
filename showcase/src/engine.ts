import { useSyncExternalStore } from 'react';
import { createPaket, DEFAULTS, type EffectName, type PaketEvent, type Preset } from '../../src/core';
import { SCENES, PRESETS } from '../../src/scenes';
import { useShowcase } from './store';

export { SCENES, PRESETS };
export const WORLD = DEFAULTS.world;
export const START_X = (WORLD.width - 16) / 2;

/** The one real engine. Its SVG lives in this detached host until the HUD's source panel mounts it. */
export const engineHost = document.createElement('div');
engineHost.className = 'engine-host';

export interface EngineStatus { preset: string | null; effect: EffectName | null; scene: string; lastEvent: PaketEvent | null }
let status: EngineStatus = { preset: null, effect: null, scene: '4', lastEvent: null };
const listeners = new Set<() => void>();
const update = (patch: Partial<EngineStatus>) => { status = { ...status, ...patch }; listeners.forEach(l => l()); };

export const paket = createPaket(engineHost, {
  scenes: SCENES,
  scene: SCENES[status.scene],
  start: { x: START_X },
  palette: useShowcase.getState().palette,
  // the source panel sits on the drawing, so its scene uses the sheet's blues
  colors: { bg: '#011f4b', surface: '#052451', line: '#1d4b8a', lineStrong: '#4f7dbb', muted: '#a4c2dc' },
  draggable: true,
  // window-wide so arrow keys drive Paket wherever focus is; the engine ignores keys typed into form fields
  keyboard: { target: 'window' },
  onEvent: ev => {
    if (ev.type === 'presetStart') update({ preset: ev.name, lastEvent: ev });
    else if (ev.type === 'presetEnd') update({ preset: null, lastEvent: ev });
    else if (ev.type === 'effectStart') update({ effect: ev.name === 'jelly' ? status.effect : ev.name, lastEvent: ev });
    else if (ev.type === 'effectEnd') update({ effect: null, lastEvent: ev });
    else update({ lastEvent: ev });
  },
});

useShowcase.subscribe((s, prev) => { if (s.palette !== prev.palette) paket.setPalette(s.palette); });

// number keys switch scenes inside the engine; keep the status in step
window.addEventListener('keydown', e => { if (SCENES[e.key] && !(e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) update({ scene: e.key }); });

export function setScene(key: string) { paket.setScene(key); update({ scene: key }); }
export function playPreset(key: string) {
  const p: Preset | undefined = PRESETS[key];
  if (!p) return;
  paket.play(p);
  if (p.scene) update({ scene: p.scene });
}
export const playEffect = (name: EffectName) => paket.effect(name);

export function useEngineStatus(): EngineStatus {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => status);
}
