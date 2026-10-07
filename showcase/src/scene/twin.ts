import { DEFAULTS } from '../../../src/core';
import { reducedMotion } from '../store';
import { CENTRE } from '../model/voxels';

export const DEG = Math.PI / 180;
const W = DEFAULTS.world;
/** Engine world (y down, sprite top-left) → scene (y up, centred on the sheet, ground at 0). */
export const toSceneX = (x: number) => x - W.width / 2;
export const toSceneY = (y: number) => W.ground - y;

/** Per-frame values the twin publishes for the camera, the footprint and the post-processing. Mutated, never rendered. */
export const twin = {
  /** sprite centre in scene units */
  x: 0, y: CENTRE,
  /** height of the feet above the ground */
  lift: 0,
  /** 0 → flat sprite, 1 → full depth */
  extrude: reducedMotion ? 1 : 0,
  explode: 0,
};

export const damp = (from: number, to: number, rate: number, dt: number) => to + (from - to) * Math.exp(-rate * dt);
