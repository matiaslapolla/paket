import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, Lightformer } from '@react-three/drei';
import type * as THREE from 'three';
import { useT } from '../i18n';
import { CameraRig, BASE_DISTANCE } from './CameraRig';
import { Effects } from './Effects';
import { Footprint } from './Footprint';
import { Paket3D } from './Paket3D';
import { Platforms } from './Platforms';
import { registerCanvas } from './exporters';
import { INK, PAPER, PAPER_DEEP } from './twin';
import { labelLayer } from './Label';
import './scene.css';

function Lights() {
  return (
    <>
      <hemisphereLight args={[INK, PAPER_DEEP, 1.2]} />
      <directionalLight position={[20, 40, 30]} intensity={2.2} />
      <directionalLight position={[-30, 15, -10]} intensity={0.6} color="#9fc3ff" />
      {/* procedural reflections: nothing is downloaded */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 20, 20]} scale={[40, 10, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#9fc3ff" position={[-30, 5, 0]} rotation-y={Math.PI / 2} scale={[30, 8, 1]} />
        <Lightformer form="rect" intensity={1} color="#ffd8a8" position={[30, 5, -10]} rotation-y={-Math.PI / 2} scale={[20, 6, 1]} />
      </Environment>
    </>
  );
}

function NoWebGL() {
  const t = useT();
  return <p className="no-webgl">{t('scene.noWebgl')}</p>;
}

export function Stage() {
  const grid = useRef<THREE.Mesh>(null);
  return (
    <div className="stage">
      <Canvas
        flat
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        camera={{ fov: 30, near: 0.5, far: 6000, position: [0, 7, BASE_DISTANCE] }}
        onCreated={({ gl }) => registerCanvas(gl.domElement)}
        fallback={<NoWebGL />}
      >
        <color attach="background" args={[PAPER]} />
        <fog attach="fog" args={[PAPER, 90, 280]} />
        <Lights />
        <Grid
          ref={grid}
          position={[0, -0.01, 0]}
          infiniteGrid
          cellSize={1}
          cellThickness={0.6}
          cellColor="#1d4b8a"
          sectionSize={8}
          sectionThickness={1}
          sectionColor="#4f7dbb"
          fadeDistance={170}
          fadeStrength={1.4}
        />
        <Platforms />
        <Footprint />
        <Paket3D />
        <CameraRig grid={grid} />
        <Effects />
      </Canvas>
      <div className="stage-labels" ref={el => { labelLayer.el = el; }} />
    </div>
  );
}
