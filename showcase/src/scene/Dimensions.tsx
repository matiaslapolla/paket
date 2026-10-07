import { useMemo } from 'react';
import * as THREE from 'three';
import { REST_BOUNDS } from '../model/voxels';
import { useShowcase } from '../store';
import { mm } from '../i18n';
import { INK } from './twin';
import { Label } from './Label';

/** Overall width, height and depth of the rest pose, drafted around the twin. Coordinates are the twin's root: its origin is 8 voxels above the feet. */
const [x0, y0b, z0] = REST_BOUNDS.min;
const [x1, y1b, z1] = REST_BOUNDS.max;
const y0 = y0b - 8 + 0.02, y1 = y1b - 8;
const GAP = 0.6, OFF = 4, OVER = 0.8, TICK = 0.6;
const zW = z1 + OFF, xD = x1 + OFF, xH = x0 - OFF;

type P = [number, number, number];
const SEGMENTS: [P, P][] = [
  // width, on the floor in front
  [[x0, y0, z1 + GAP], [x0, y0, zW + OVER]], [[x1, y0, z1 + GAP], [x1, y0, zW + OVER]], [[x0, y0, zW], [x1, y0, zW]],
  [[x0 - TICK, y0, zW + TICK], [x0 + TICK, y0, zW - TICK]], [[x1 - TICK, y0, zW + TICK], [x1 + TICK, y0, zW - TICK]],
  // depth, on the floor to the right
  [[x1 + GAP, y0, z0], [xD + OVER, y0, z0]], [[x1 + GAP, y0, z1], [xD + OVER, y0, z1]], [[xD, y0, z0], [xD, y0, z1]],
  [[xD - TICK, y0, z0 - TICK], [xD + TICK, y0, z0 + TICK]], [[xD - TICK, y0, z1 - TICK], [xD + TICK, y0, z1 + TICK]],
  // height, standing on the left in the front plane
  [[x0 - GAP, y0, z1], [xH - OVER, y0, z1]], [[x0 - GAP, y1, z1], [xH - OVER, y1, z1]], [[xH, y0, z1], [xH, y1, z1]],
  [[xH - TICK, y0 - TICK, z1], [xH + TICK, y0 + TICK, z1]], [[xH - TICK, y1 - TICK, z1], [xH + TICK, y1 + TICK, z1]],
];

export function Dimensions() {
  const pitch = useShowcase(s => s.pitch);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(SEGMENTS.flat().map(p => new THREE.Vector3(...p))), []);
  const label = (voxels: number, position: P) => <Label kind="dim" position={position}>{`${mm(voxels * pitch)} mm`}</Label>;
  return (
    <>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={INK} transparent opacity={0.8} depthWrite={false} />
      </lineSegments>
      {label(x1 - x0, [(x0 + x1) / 2, y0, zW])}
      {label(z1 - z0, [xD, y0, (z0 + z1) / 2])}
      {label(y1b - y0b, [xH, (y0 + y1) / 2, z1])}
    </>
  );
}
