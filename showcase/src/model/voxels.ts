import { PARTS, type Palette, type PartName, type Frame } from '../../../src/sprite';

/**
 * The 3D twin is extruded from the sprite at runtime: every pixel of every pose frame becomes a column of voxels.
 * Model units are voxels. Sprite column s → X = s − 8, sprite row t → Y = 14 − t (feet on Y = 0), Z is depth.
 */

export type PaletteKey = keyof Palette;
/** A unit cube occupying [x, x+1] × [y, y+1] × [z, z+1]. */
export interface Voxel { x: number; y: number; z: number; key: PaletteKey }
export interface FaceGroup { positions: Float32Array; normals: Float32Array; indices: Uint32Array }
export interface VoxelMesh {
  /** exposed faces, one group per palette key so colours can change without rebuilding */
  faces: Partial<Record<PaletteKey, FaceGroup>>;
  /** feature edges: silhouette, creases and colour boundaries, as segment pairs */
  edges: Float32Array;
  /** the remaining voxel seams, for the construction-line overlay */
  seams: Float32Array;
  voxels: number;
}

export const PART_ORDER: PartName[] = ['head', 'torso', 'armL', 'armR', 'legL', 'legR'];
export const REST_POSE: Record<PartName, string> = { head: 'center', torso: 'base', armL: 'down', armR: 'down', legL: 'stand', legR: 'stand' };

/** Depth extent [z0, z1) behind a sprite pixel. The head steps from 6 to 10 deep to read as a dome. */
function depth(part: PartName, row: number): [number, number] {
  if (part === 'head') return row <= 1 ? [-3, 3] : row === 2 ? [-4, 4] : [-5, 5];
  if (part === 'torso') return [-4, 4];
  if (part === 'legL' || part === 'legR') return [-2, 2];
  return [-1, 1];
}

export function frameVoxels(part: PartName, frame: Frame): Voxel[] {
  const out: Voxel[] = [];
  for (const [col, row, key] of frame) {
    const [z0, z1] = depth(part, row);
    for (let z = z0; z < z1; z++) {
      const front = z === z1 - 1;
      // the visor is recessed one voxel; eyes and glow sit flush with the face, in front of the visor
      if (key === 'visor' && front) continue;
      const k: PaletteKey = key === 'visor' ? (z === z1 - 2 ? 'visor' : 'body') : key === 'eye' || key === 'glow' ? (front ? key : 'body') : key;
      out.push({ x: col - 8, y: 14 - row, z, key: k });
    }
  }
  return out;
}

const cell = (x: number, y: number, z: number) => `${x},${y},${z}`;

export function meshVoxels(voxels: Voxel[]): VoxelMesh {
  const at = new Map<string, PaletteKey>();
  for (const v of voxels) at.set(cell(v.x, v.y, v.z), v.key);
  const has = (p: number[]) => at.has(cell(p[0], p[1], p[2]));

  const groups: Partial<Record<PaletteKey, { p: number[]; n: number[]; i: number[] }>> = {};
  const edges = new Map<string, number[]>(), seams = new Map<string, number[]>();
  const addSeg = (into: Map<string, number[]>, a: number[], b: number[]) => {
    const k = a.join() < b.join() ? `${a}|${b}` : `${b}|${a}`;
    if (!into.has(k)) into.set(k, [...a, ...b]);
  };

  for (const v of voxels) {
    const o = [v.x, v.y, v.z];
    for (let axis = 0; axis < 3; axis++) {
      for (const sign of [1, -1]) {
        const n = [0, 0, 0]; n[axis] = sign;
        if (has([o[0] + n[0], o[1] + n[1], o[2] + n[2]])) continue;
        const u = (axis + 1) % 3, w = (axis + 2) % 3;
        const corner = (cu: number, cw: number) => { const c = [...o]; c[axis] += sign > 0 ? 1 : 0; c[u] += cu; c[w] += cw; return c; };
        const quad = [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
        if (sign < 0) quad.reverse();
        const g = (groups[v.key] ??= { p: [], n: [], i: [] });
        const base = g.p.length / 3;
        for (const c of quad) { g.p.push(...c); g.n.push(...n); }
        g.i.push(base, base + 1, base + 2, base, base + 2, base + 3);

        // An edge is a feature unless the face carries on, coplanar and in the same colour, past it.
        const sides: [number, number, number[], number[]][] = [[u, -1, corner(0, 0), corner(0, 1)], [u, 1, corner(1, 0), corner(1, 1)], [w, -1, corner(0, 0), corner(1, 0)], [w, 1, corner(0, 1), corner(1, 1)]];
        for (const [ax, s, a, b] of sides) {
          const nb = [...o]; nb[ax] += s;
          const nbKey = at.get(cell(nb[0], nb[1], nb[2]));
          const continues = nbKey === v.key && !has([nb[0] + n[0], nb[1] + n[1], nb[2] + n[2]]);
          addSeg(continues ? seams : edges, a, b);
        }
      }
    }
  }
  for (const k of edges.keys()) seams.delete(k);

  const faces: VoxelMesh['faces'] = {};
  for (const [key, g] of Object.entries(groups) as [PaletteKey, { p: number[]; n: number[]; i: number[] }][]) {
    faces[key] = { positions: new Float32Array(g.p), normals: new Float32Array(g.n), indices: new Uint32Array(g.i) };
  }
  return { faces, edges: new Float32Array([...edges.values()].flat()), seams: new Float32Array([...seams.values()].flat()), voxels: voxels.length };
}

/** Every pose frame of every part, meshed once. */
export const MODEL: Record<PartName, Record<string, VoxelMesh>> = Object.fromEntries(
  PART_ORDER.map(part => [part, Object.fromEntries(Object.entries(PARTS[part]).map(([name, f]) => [name, meshVoxels(frameVoxels(part, f))]))]),
) as Record<PartName, Record<string, VoxelMesh>>;

/** Rotation centre of each part in model units: the centre of its bounding box over all frames, as the engine uses. */
export const PIVOTS: Record<PartName, [number, number]> = Object.fromEntries(PART_ORDER.map(part => {
  const px = Object.values(PARTS[part]).flat();
  const xs = px.map(p => p[0]), ys = px.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2, cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
  return [part, [cx - 8, 15 - cy]];
})) as Record<PartName, [number, number]>;

export function restVoxels(part: PartName): Voxel[] {
  return frameVoxels(part, PARTS[part][REST_POSE[part]]);
}

/* ---------- physical numbers for the title block and the bill of materials ---------- */

export type MaterialId = 'abs' | 'pla' | 'resin' | 'zinc';
/** g/cm³ */
export const DENSITY: Record<MaterialId, number> = { abs: 1.04, pla: 1.24, resin: 1.18, zinc: 6.6 };

export interface PartStats { part: PartName; voxels: number; volumeCm3: number; massG: number; keys: PaletteKey[] }
export interface ModelStats {
  parts: PartStats[];
  voxels: number; volumeCm3: number; massG: number;
  /** overall size of the rest pose, in voxels and in mm */
  size: { w: number; h: number; d: number };
  sizeMm: { w: number; h: number; d: number };
}

export function modelStats(pitchMm: number, material: MaterialId): ModelStats {
  const cm3 = (n: number) => (n * pitchMm ** 3) / 1000;
  const all: Voxel[] = [];
  const parts = PART_ORDER.map(part => {
    const vs = restVoxels(part); all.push(...vs);
    const volumeCm3 = cm3(vs.length);
    return { part, voxels: vs.length, volumeCm3, massG: volumeCm3 * DENSITY[material], keys: [...new Set(vs.map(v => v.key))] };
  });
  const ext = (k: 'x' | 'y' | 'z') => Math.max(...all.map(v => v[k])) + 1 - Math.min(...all.map(v => v[k]));
  const size = { w: ext('x'), h: ext('y'), d: ext('z') };
  const volumeCm3 = cm3(all.length);
  return {
    parts, voxels: all.length, volumeCm3, massG: volumeCm3 * DENSITY[material],
    size, sizeMm: { w: size.w * pitchMm, h: size.h * pitchMm, d: size.d * pitchMm },
  };
}

/** Rest-pose bounds in model units, for dimension lines. */
export const REST_BOUNDS = (() => {
  const all = PART_ORDER.flatMap(restVoxels);
  const lo = (k: 'x' | 'y' | 'z') => Math.min(...all.map(v => v[k]));
  const hi = (k: 'x' | 'y' | 'z') => Math.max(...all.map(v => v[k])) + 1;
  return { min: [lo('x'), lo('y'), lo('z')] as const, max: [hi('x'), hi('y'), hi('z')] as const };
})();
