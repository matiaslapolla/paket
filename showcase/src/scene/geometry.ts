import * as THREE from 'three';
import type { FaceGroup } from '../model/voxels';

export function faceGeometry(g: FaceGroup) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(g.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(g.normals, 3));
  geo.setIndex(new THREE.BufferAttribute(g.indices, 1));
  return geo;
}
