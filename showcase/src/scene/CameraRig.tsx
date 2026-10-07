import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { reducedMotion, useShowcase, type Insets, type ViewName } from '../store';
import { DEG, damp, twin } from './twin';

/** azimuth, polar. ISO is the true isometric direction, so with the orthographic toggle it is a real isometric view. */
const VIEWS: Record<ViewName, [number, number]> = {
  iso: [45 * DEG, (90 - 35.264) * DEG],
  front: [0, 90 * DEG],
  side: [90 * DEG, 90 * DEG],
  top: [0, 0.0001],
};
export const BASE_DISTANCE = 84;
/** "orthographic" is a dolly zoom to a ~4° lens: perspective all but disappears and the controls stay the same */
const ORTHO_ZOOM = 8;
const TURNTABLE = 0.22;
/** Distance that keeps ~34 voxels across and ~26 up the part of the screen the HUD leaves free. */
function fitDistance(w: number, h: number, i: Insets) {
  const freeW = Math.max(0.2, (w - i.left - i.right) / w), freeH = Math.max(0.2, (h - i.top - i.bottom) / h);
  return Math.max(BASE_DISTANCE, 63 / ((w / h) * freeW), 48 / freeH);
}

export function CameraRig({ grid }: { grid: React.RefObject<THREE.Mesh | null> }) {
  const ref = useRef<CameraControls>(null);
  const scene = useThree(s => s.scene);
  const size = useThree(s => s.size);
  const insets = useShowcase(s => s.insets);
  const exploded = useShowcase(s => s.exploded);
  const offset = useRef({ x: 0, y: 0 });
  const { view, viewNonce, ortho, turntable } = useShowcase(useShallow(s => ({ view: s.view, viewNonce: s.viewNonce, ortho: s.ortho, turntable: s.turntable })));
  const ready = useRef(reducedMotion);
  const grabbing = useRef(false);
  const target = useRef(new THREE.Vector3(0, 7, 0));

  const turnTo = (v: ViewName, animate: boolean) => {
    const c = ref.current;
    if (!c) return;
    c.normalizeRotations();
    const [a, p] = VIEWS[v];
    // the nearest equivalent azimuth, so a spun turntable does not unwind
    const near = a + 2 * Math.PI * Math.round((c.azimuthAngle - a) / (2 * Math.PI));
    c.rotateTo(near, p, animate);
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const start = () => { grabbing.current = true; };
    const end = () => { grabbing.current = false; };
    c.addEventListener('controlstart', start);
    c.addEventListener('controlend', end);
    c.moveTo(target.current.x, target.current.y, target.current.z, false);
    let timer = 0;
    if (reducedMotion) turnTo(useShowcase.getState().view, false);
    else {
      // intro: start square to the sprite, swing to the chosen view while it extrudes
      c.rotateTo(0, 90 * DEG, false);
      timer = window.setTimeout(() => { ready.current = true; turnTo(useShowcase.getState().view, true); }, 1100);
    }
    return () => { clearTimeout(timer); c.removeEventListener('controlstart', start); c.removeEventListener('controlend', end); };
  }, []);

  useEffect(() => {
    if (!ready.current || viewNonce === 0) return;
    turnTo(view, !reducedMotion);
    if (useShowcase.getState().turntable) useShowcase.setState({ turntable: false });
  }, [view, viewNonce]);

  // Framing is computed, never read back from the camera: toggling ortho or exploded mid-transition stays exact.
  useEffect(() => {
    const c = ref.current;
    if (!c || !size.height) return;
    const zoom = ortho ? ORTHO_ZOOM : 1;
    // the exploded assembly is about twice as tall as Paket
    const room = exploded ? 1.45 : 1;
    c.zoomTo(zoom, !reducedMotion);
    c.dollyTo(fitDistance(size.width, size.height, insets) * room * zoom, !reducedMotion);
  }, [size.width, size.height, insets, exploded, ortho]);

  useFrame((_, dt) => {
    const c = ref.current;
    if (!c) return;
    // shift the projection centre into the middle of the free area, gliding with the HUD
    const o = offset.current, cam = c.camera as THREE.PerspectiveCamera;
    const ox = (insets.right - insets.left) / 2, oy = (insets.bottom - insets.top) / 2;
    if (Math.abs(o.x - ox) + Math.abs(o.y - oy) > 0.25 || (cam.view?.fullWidth ?? size.width) !== size.width || (cam.view?.fullHeight ?? size.height) !== size.height) {
      o.x = reducedMotion ? ox : damp(o.x, ox, 14, dt); o.y = reducedMotion ? oy : damp(o.y, oy, 14, dt);
      if (Math.abs(o.x) + Math.abs(o.y) < 0.25) cam.clearViewOffset();
      else cam.setViewOffset(size.width, size.height, o.x, o.y, size.width, size.height);
    }
    const t = target.current;
    t.x = damp(t.x, twin.x, 6, dt);
    t.y = damp(t.y, 7 + twin.lift * 0.6 + twin.explode * 3, 4, dt);
    c.moveTo(t.x, t.y, t.z, false);
    if (turntable && ready.current && !grabbing.current && !reducedMotion) c.rotate(dt * TURNTABLE, 0, true);

    // keep fog and grid fade proportional to the camera distance, so the orthographic dolly does not wash them out
    const d = c.distance;
    if (scene.fog instanceof THREE.Fog) { scene.fog.near = d * 1.5; scene.fog.far = d * 4.5; }
    const mat = grid.current?.material as THREE.ShaderMaterial | undefined;
    if (mat?.uniforms?.fadeDistance) mat.uniforms.fadeDistance.value = d * 2.6;
  });

  return <CameraControls ref={ref} makeDefault minDistance={14} maxDistance={5000} truckSpeed={0} smoothTime={0.32} />;
}
