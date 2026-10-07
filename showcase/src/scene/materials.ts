import type * as THREE from 'three';
import type { PaletteKey } from '../model/voxels';
import type { Finish } from '../store';

/** Physical surface per palette key and finish. The prototype render and the GLB export use the same numbers. */
export function surface(k: PaletteKey, finish: Finish): THREE.MeshPhysicalMaterialParameters {
  if (k === 'visor') return { roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 };
  if (finish === 'gloss') return { roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 };
  if (finish === 'metal') return { roughness: 0.28, metalness: 0.9 };
  return { roughness: 0.85, metalness: 0 };
}
