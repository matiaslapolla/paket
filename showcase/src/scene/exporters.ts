import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { useShowcase } from '../store';
import { PART_ORDER, meshVoxels, restVoxels, type FaceGroup, type PaletteKey } from '../model/voxels';

function geometry(g: FaceGroup) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(g.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(g.normals, 3));
  geo.setIndex(new THREE.BufferAttribute(g.indices, 1));
  return geo;
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const stamp = () => `paket-${useShowcase.getState().pitch}mm`;

/** One closed shell of the rest pose, in millimetres: what a slicer or a toolmaker opens. */
export function exportSTL() {
  const { pitch } = useShowcase.getState();
  const mesh = meshVoxels(PART_ORDER.flatMap(restVoxels));
  const group = new THREE.Group();
  for (const g of Object.values(mesh.faces)) group.add(new THREE.Mesh(geometry(g)));
  group.scale.setScalar(pitch);
  group.updateMatrixWorld(true);
  const data = new STLExporter().parse(group, { binary: true }) as DataView;
  download(new Blob([data.buffer as ArrayBuffer], { type: 'model/stl' }), `${stamp()}.stl`);
}

/** Coloured model, one node per part, in metres as glTF expects. */
export async function exportGLB() {
  const { pitch, palette, finish } = useShowcase.getState();
  const root = new THREE.Group(); root.name = 'paket';
  const materials = Object.fromEntries((Object.keys(palette) as PaletteKey[]).map(k => [k, new THREE.MeshStandardMaterial({
    name: k, color: palette[k],
    roughness: finish === 'matte' ? 0.8 : finish === 'gloss' ? 0.3 : 0.35,
    metalness: finish === 'metal' ? 0.85 : 0,
    emissive: k === 'eye' || k === 'glow' ? palette[k] : '#000000',
  })])) as Record<PaletteKey, THREE.MeshStandardMaterial>;
  for (const part of PART_ORDER) {
    const node = new THREE.Group(); node.name = part;
    const { faces } = meshVoxels(restVoxels(part));
    for (const [k, g] of Object.entries(faces) as [PaletteKey, FaceGroup][]) {
      const m = new THREE.Mesh(geometry(g), materials[k]); m.name = `${part}_${k}`; node.add(m);
    }
    root.add(node);
  }
  root.scale.setScalar(pitch / 1000);
  const glb = await new GLTFExporter().parseAsync(root, { binary: true });
  download(new Blob([glb as ArrayBuffer], { type: 'model/gltf-binary' }), `${stamp()}.glb`);
}

let canvas: HTMLCanvasElement | null = null;
export const registerCanvas = (c: HTMLCanvasElement) => { canvas = c; };

/** The current view as it is on screen (the canvas keeps its drawing buffer for this). */
export function exportPNG() {
  canvas?.toBlob(b => b && download(b, `${stamp()}.png`), 'image/png');
}
