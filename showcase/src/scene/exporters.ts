import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { useShowcase } from '../store';
import { PALETTE_KEYS, PART_ORDER, isLit, meshVoxels, restVoxels, type FaceGroup, type PaletteKey } from '../model/voxels';
import { faceGeometry } from './geometry';
import { surface } from './materials';

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const fileName = (ext: string) => `paket-${useShowcase.getState().pitch}mm.${ext}`;

/** One closed shell of the rest pose, in millimetres: what a slicer or a toolmaker opens. */
export function exportSTL() {
  const { pitch } = useShowcase.getState();
  const mesh = meshVoxels(PART_ORDER.flatMap(restVoxels));
  const group = new THREE.Group();
  for (const g of Object.values(mesh.faces)) group.add(new THREE.Mesh(faceGeometry(g)));
  group.scale.setScalar(pitch);
  group.updateMatrixWorld(true);
  const data = new STLExporter().parse(group, { binary: true }) as DataView;
  download(new Blob([data.buffer as ArrayBuffer], { type: 'model/stl' }), fileName('stl'));
}

/** Coloured model, one node per part, in metres as glTF expects. */
export async function exportGLB() {
  const { pitch, palette, finish } = useShowcase.getState();
  const root = new THREE.Group(); root.name = 'paket';
  const materials = Object.fromEntries(PALETTE_KEYS.map(k => [k, isLit(k)
    ? new THREE.MeshStandardMaterial({ name: k, color: palette[k], emissive: palette[k] })
    : new THREE.MeshPhysicalMaterial({ name: k, color: palette[k], ...surface(k, finish) })])) as Record<PaletteKey, THREE.MeshStandardMaterial>;
  for (const part of PART_ORDER) {
    const node = new THREE.Group(); node.name = part;
    const { faces } = meshVoxels(restVoxels(part));
    for (const [k, g] of Object.entries(faces) as [PaletteKey, FaceGroup][]) {
      const m = new THREE.Mesh(faceGeometry(g), materials[k]); m.name = `${part}_${k}`; node.add(m);
    }
    root.add(node);
  }
  root.scale.setScalar(pitch / 1000);
  const glb = await new GLTFExporter().parseAsync(root, { binary: true });
  download(new Blob([glb as ArrayBuffer], { type: 'model/gltf-binary' }), fileName('glb'));
}

let canvas: HTMLCanvasElement | null = null;
export const registerCanvas = (c: HTMLCanvasElement) => { canvas = c; };

/** The current view as it is on screen (the canvas keeps its drawing buffer for this). */
export function exportPNG() {
  return new Promise<void>((resolve, reject) => {
    if (!canvas) return reject(new Error('no canvas'));
    canvas.toBlob(b => { if (!b) return reject(new Error('empty canvas')); download(b, fileName('png')); resolve(); }, 'image/png');
  });
}
