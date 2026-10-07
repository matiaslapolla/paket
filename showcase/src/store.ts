import { create } from 'zustand';
import { DEFAULT_PALETTE, type Palette } from '../../src/sprite';
import type { MaterialId } from './model/voxels';

export type RenderMode = 'blueprint' | 'prototype' | 'hybrid';
export type ViewName = 'iso' | 'front' | 'side' | 'top';
export type Finish = 'matte' | 'gloss' | 'metal';
export type Lang = 'en' | 'zh';

export const COLORWAYS: Record<string, Palette> = {
  senda: DEFAULT_PALETTE,
  ember: { body: '#f08a3c', shade: '#8a3c14', visor: '#14100c', eye: '#fff1e0', glow: '#ffd27a' },
  moss: { body: '#8fbf5a', shade: '#3f6a24', visor: '#0e130a', eye: '#effae0', glow: '#d6f59a' },
  ink: { body: '#2b2f36', shade: '#14171b', visor: '#05070a', eye: '#7fe3e6', glow: '#24c1c7' },
  snow: { body: '#e8ecf0', shade: '#9aa6b2', visor: '#11161c', eye: '#24c1c7', glow: '#7fe3e6' },
};

export const PITCH_RANGE = { min: 2, max: 12, step: 0.5 } as const;

export interface ShowcaseState {
  lang: Lang;
  palette: Palette;
  renderMode: RenderMode;
  finish: Finish;
  material: MaterialId;
  /** millimetres per voxel */
  pitch: number;
  view: ViewName;
  /** bumps on every view request so picking the current view again re-frames it */
  viewNonce: number;
  ortho: boolean;
  turntable: boolean;
  exploded: boolean;
  showDims: boolean;
  showSeams: boolean;

  setLang(l: Lang): void;
  setPalette(p: Partial<Palette>): void;
  setRenderMode(m: RenderMode): void;
  setFinish(f: Finish): void;
  setMaterial(m: MaterialId): void;
  setPitch(mm: number): void;
  setView(v: ViewName): void;
  toggle(k: 'ortho' | 'turntable' | 'exploded' | 'showDims' | 'showSeams'): void;
}

const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const initialLang: Lang = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';

export const useShowcase = create<ShowcaseState>(set => ({
  lang: initialLang,
  palette: DEFAULT_PALETTE,
  renderMode: 'blueprint',
  finish: 'gloss',
  material: 'abs',
  pitch: 5,
  view: 'iso',
  viewNonce: 0,
  ortho: false,
  turntable: !reducedMotion,
  exploded: false,
  showDims: true,
  showSeams: true,

  setLang: lang => set({ lang }),
  setPalette: p => set(s => ({ palette: { ...s.palette, ...p } })),
  setRenderMode: renderMode => set({ renderMode }),
  setFinish: finish => set({ finish }),
  setMaterial: material => set({ material }),
  setPitch: mm => set({ pitch: Math.min(PITCH_RANGE.max, Math.max(PITCH_RANGE.min, mm)) }),
  setView: view => set(s => ({ view, viewNonce: s.viewNonce + 1 })),
  toggle: k => set(s => ({ [k]: !s[k] }) as Partial<ShowcaseState>),
}));
