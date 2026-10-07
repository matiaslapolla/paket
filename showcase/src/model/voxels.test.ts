import { describe, expect, it } from 'vitest';
import { PARTS } from '../../../src/sprite';
import { MODEL, PART_ORDER, meshVoxels, modelStats, restVoxels, type FaceGroup, type Voxel } from './voxels';

const segments = (a: Float32Array) => a.length / 6;
const quads = (g?: FaceGroup) => (g ? g.indices.length / 6 : 0);

describe('meshVoxels', () => {
  it('meshes a single voxel as a cube with 12 feature edges', () => {
    const m = meshVoxels([{ x: 0, y: 0, z: 0, key: 'body' }]);
    expect(quads(m.faces.body)).toBe(6);
    expect(segments(m.edges)).toBe(12);
    expect(segments(m.seams)).toBe(0);
  });

  it('turns the ring between two same-colour voxels into seams, not edges', () => {
    const m = meshVoxels([{ x: 0, y: 0, z: 0, key: 'body' }, { x: 1, y: 0, z: 0, key: 'body' }]);
    expect(quads(m.faces.body)).toBe(10);
    // unit segments: the box outline is 16 of them (the long edges are two each)
    expect(segments(m.edges)).toBe(16);
    expect(segments(m.seams)).toBe(4);
  });

  it('keeps a colour boundary as a feature edge', () => {
    const m = meshVoxels([{ x: 0, y: 0, z: 0, key: 'body' }, { x: 1, y: 0, z: 0, key: 'shade' }]);
    expect(segments(m.edges)).toBe(20);
    expect(segments(m.seams)).toBe(0);
  });
});

describe('the twin', () => {
  it('meshes every pose frame of every part', () => {
    for (const part of PART_ORDER) {
      expect(Object.keys(MODEL[part])).toEqual(Object.keys(PARTS[part]));
      for (const mesh of Object.values(MODEL[part])) expect(mesh.voxels).toBeGreaterThan(0);
    }
  });

  it('is 14 × 14 × 10 voxels at rest, 70 × 70 × 50 mm at a 5 mm pitch', () => {
    const s = modelStats(5, 'abs');
    expect(s.size).toEqual({ w: 14, h: 14, d: 10 });
    expect(s.sizeMm).toEqual({ w: 70, h: 70, d: 50 });
    expect(s.parts.reduce((n, p) => n + p.voxels, 0)).toBe(s.voxels);
    expect(s.massG).toBeCloseTo(s.volumeCm3 * 1.04);
  });

  it('mirrors the right arm from the left one', () => {
    const key = (v: Voxel) => `${v.x},${v.y},${v.z},${v.key}`;
    const left = restVoxels('armL').map(v => key({ ...v, x: -v.x - 1 })).sort();
    expect(restVoxels('armR').map(key).sort()).toEqual(left);
  });

  it('recesses the visor behind the face and keeps the eyes flush', () => {
    const head = restVoxels('head');
    const front = Math.max(...head.map(v => v.z));
    expect(head.some(v => v.key === 'visor' && v.z === front)).toBe(false);
    expect(head.some(v => v.key === 'visor' && v.z === front - 1)).toBe(true);
    expect(head.filter(v => v.key === 'eye').every(v => v.z === front)).toBe(true);
  });

  it('assembles into a closed, consistently wound surface (printable STL)', () => {
    const mesh = meshVoxels(PART_ORDER.flatMap(restVoxels));
    const directed = new Map<string, number>();
    for (const g of Object.values(mesh.faces)) {
      const p = (i: number) => [g.positions[i * 3], g.positions[i * 3 + 1], g.positions[i * 3 + 2]].join();
      for (let t = 0; t < g.indices.length; t += 3) {
        const tri = [g.indices[t], g.indices[t + 1], g.indices[t + 2]].map(p);
        for (let e = 0; e < 3; e++) {
          const k = `${tri[e]}>${tri[(e + 1) % 3]}`;
          directed.set(k, (directed.get(k) ?? 0) + 1);
        }
      }
    }
    for (const [k, n] of directed) {
      const [a, b] = k.split('>');
      // quad diagonals pair inside the quad; every other edge pairs with the face across it
      expect(directed.get(`${b}>${a}`), k).toBe(n);
    }
  });
});
