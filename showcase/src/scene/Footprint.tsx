import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { REST_BOUNDS } from '../model/voxels';
import { useShowcase } from '../store';
import { INK, PAPER_DEEP, twin } from './twin';

/** Where Paket meets the floor: a dashed plan outline on the drawing, a soft contact shadow on the prototype. */
export function Footprint() {
  const solid = useShowcase(s => s.renderMode !== 'blueprint');
  const group = useRef<THREE.Group>(null);
  const outline = useMemo(() => {
    const [x0, , z0] = REST_BOUNDS.min, [x1, , z1] = REST_BOUNDS.max;
    const geometry = new THREE.BufferGeometry().setFromPoints([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([x, z]) => new THREE.Vector3(x, 0.03, z)));
    const line = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color: INK, transparent: true, opacity: 0.5, dashSize: 0.7, gapSize: 0.5 }));
    line.computeLineDistances();
    return line;
  }, []);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.x = twin.x;
    group.current.visible = twin.explode < 0.5;
  });
  return (
    <group ref={group}>
      {solid
        ? <ContactShadows position={[0, 0.02, 0]} scale={36} far={24} blur={2.2} opacity={0.6} color={PAPER_DEEP} resolution={512} />
        : <primitive object={outline} />}
    </group>
  );
}
