import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** The DOM layer over the canvas that holds every scene label; Stage fills it in. */
export const labelLayer: { el: HTMLDivElement | null } = { el: null };

function shown(o: THREE.Object3D | null): boolean {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/**
 * A text label pinned to a point in the scene, kept at a constant pixel size like the lettering on a drawing.
 * Plain DOM moved every frame: no React root per label, and it reads crisply at any zoom.
 */
type LabelProps = { position: [number, number, number]; children: string } & ({ kind: 'dim'; unit: string } | { kind: 'callout'; n: number });

export function Label(props: LabelProps) {
  const { position, children: text, kind } = props;
  const detail = props.kind === 'dim' ? props.unit : String(props.n);
  const anchor = useRef<THREE.Group>(null);
  const camera = useThree(s => s.camera);
  const size = useThree(s => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  const node = useMemo(() => {
    const el = document.createElement('div');
    el.className = `scene-label ${kind}`;
    el.style.display = 'none';
    return el;
  }, [kind]);

  useEffect(() => {
    node.replaceChildren();
    if (kind === 'callout') {
      const num = document.createElement('span'); num.className = 'callout-n'; num.textContent = detail;
      const name = document.createElement('span'); name.className = 'callout-name'; name.textContent = text;
      node.append(num, name);
    } else {
      const unit = document.createElement('small'); unit.textContent = detail;
      node.append(text, unit);
    }
  }, [node, kind, text, detail]);

  useEffect(() => {
    labelLayer.el?.appendChild(node);
    return () => node.remove();
  }, [node]);

  useFrame(() => {
    if (!anchor.current) return;
    camera.updateMatrixWorld();
    anchor.current.getWorldPosition(v).project(camera);
    const visible = shown(anchor.current) && v.z < 1;
    node.style.display = visible ? '' : 'none';
    if (visible) node.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
  });

  return <group ref={anchor} position={position} />;
}
