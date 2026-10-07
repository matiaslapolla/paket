import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import type { ChromaticAberrationEffect } from 'postprocessing';
import * as THREE from 'three';
import { paket } from '../engine';

const STILL = new THREE.Vector2(0, 0);

export function Effects() {
  const aberration = useRef<ChromaticAberrationEffect>(null);
  useFrame(() => {
    // the engine's glitch effect tears the image too
    const on = paket.getState().effect === 'glitch';
    aberration.current?.offset.set(on ? (Math.random() - 0.5) * 0.014 : 0, on ? (Math.random() - 0.5) * 0.006 : 0);
  });
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.15} intensity={0.9} />
      <ChromaticAberration ref={aberration} offset={STILL} radialModulation={false} modulationOffset={0} />
      <Vignette offset={0.32} darkness={0.5} />
    </EffectComposer>
  );
}
