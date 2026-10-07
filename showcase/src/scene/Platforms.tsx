import { useMemo } from 'react';
import * as THREE from 'three';
import type { Platform } from '../../../src/core';
import { paket, useEngineStatus, WORLD } from '../engine';
import { useShowcase } from '../store';
import { INK, PAPER, toSceneX, toSceneY } from './twin';

const THICK = 3, DEPTH = 16;

function Slab({ p, solid }: { p: Platform; solid: boolean }) {
  const top = toSceneY(p.y);
  const { box, edges, supports } = useMemo(() => {
    const box = new THREE.BoxGeometry(p.w, THICK, DEPTH);
    const edges = new THREE.EdgesGeometry(box);
    // construction lines from the slab's front corners down to the floor (local y of the floor: -(top - THICK / 2))
    const under = -THICK / 2, floor = -(top - THICK / 2), l = -p.w / 2, r = p.w / 2, f = DEPTH / 2;
    const supports = new THREE.BufferGeometry().setFromPoints([[l, under], [l, floor], [r, under], [r, floor]].map(([x, y]) => new THREE.Vector3(x, y, f)));
    return { box, edges, supports };
  }, [p.w, top]);
  return (
    <group position={[toSceneX(p.x) + p.w / 2, top - THICK / 2, 0]}>
      <mesh geometry={box}>
        {solid
          ? <meshStandardMaterial color={PAPER} roughness={0.9} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
          : <meshBasicMaterial color={INK} transparent opacity={0.05} depthWrite={false} />}
      </mesh>
      <lineSegments geometry={edges}><lineBasicMaterial color={INK} transparent opacity={0.75} /></lineSegments>
      <lineSegments geometry={supports} onUpdate={l => l.computeLineDistances()}>
        <lineDashedMaterial color={INK} transparent opacity={0.35} dashSize={0.8} gapSize={0.6} />
      </lineSegments>
    </group>
  );
}

/** The 2D world's edges, dashed on the floor. */
function Bounds() {
  const geometry = useMemo(() => {
    const x0 = toSceneX(0), x1 = toSceneX(WORLD.width);
    return new THREE.BufferGeometry().setFromPoints([[x0, -12], [x0, 12], [x1, -12], [x1, 12]].map(([x, z]) => new THREE.Vector3(x, 0.02, z)));
  }, []);
  return (
    <lineSegments geometry={geometry} onUpdate={l => l.computeLineDistances()}>
      <lineDashedMaterial color={INK} transparent opacity={0.4} dashSize={1.2} gapSize={0.8} />
    </lineSegments>
  );
}

export function Platforms() {
  const { scene } = useEngineStatus();
  const solid = useShowcase(s => s.renderMode !== 'blueprint');
  const platforms = useMemo(() => (scene ? paket.getScene().platforms : []), [scene]);
  return (
    <>
      {platforms.map((p, i) => <Slab key={`${scene}-${i}`} p={p} solid={solid} />)}
      <Bounds />
    </>
  );
}
