import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { Palette, PartName } from '../../../src/sprite';
import { paket } from '../engine';
import { CENTRE, MODEL, PALETTE_KEYS, PART_ORDER, PIVOTS, isLit, type PaletteKey, type VoxelMesh } from '../model/voxels';
import { reducedMotion, useShowcase, type Finish, type RenderMode } from '../store';
import { surface } from './materials';
import { useT } from '../i18n';
import { faceGeometry } from './geometry';
import { Dimensions } from './Dimensions';
import { Label } from './Label';
import { INK, PAPER_DEEP } from '../tokens';
import { DEG, damp, toSceneX, toSceneY, twin } from './twin';

/* ---------- geometry: built once per pose frame, shared by every look ---------- */

interface FrameGeometry { faces: [PaletteKey, THREE.BufferGeometry][]; edges: LineSegmentsGeometry; seams: THREE.BufferGeometry }
const geometries = new Map<VoxelMesh, FrameGeometry>();
function frameGeometry(mesh: VoxelMesh): FrameGeometry {
  let g = geometries.get(mesh);
  if (!g) {
    const seams = new THREE.BufferGeometry();
    seams.setAttribute('position', new THREE.BufferAttribute(mesh.seams, 3));
    g = {
      faces: Object.entries(mesh.faces).map(([k, f]) => [k as PaletteKey, faceGeometry(f)]),
      edges: new LineSegmentsGeometry().setPositions(mesh.edges),
      seams,
    };
    geometries.set(mesh, g);
  }
  return g;
}

/* ---------- looks: one material set per render mode and finish ---------- */

interface Look { fills: Record<PaletteKey, THREE.MeshBasicMaterial | THREE.MeshStandardMaterial>; edge: LineMaterial; hidden: LineMaterial; seam: THREE.LineBasicMaterial; edgeOpacity: number }
/** eyes are painted brighter than 1.0 so only they cross the bloom threshold */
const HDR = 2.4;
// fills sit a hair behind their edges, so edges win the depth test and hidden edges can test against fills
const OFFSET = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };

function makeLook(mode: RenderMode, finish: Finish): Look {
  const fills = {} as Look['fills'];
  for (const k of PALETTE_KEYS) {
    if (mode === 'blueprint') fills[k] = new THREE.MeshBasicMaterial({ ...OFFSET, transparent: true, opacity: isLit(k) ? 1 : 0.16 });
    else if (isLit(k)) fills[k] = new THREE.MeshBasicMaterial(OFFSET);
    else fills[k] = new THREE.MeshPhysicalMaterial({ ...OFFSET, ...surface(k, finish) });
  }
  const hybrid = mode === 'hybrid';
  const edgeOpacity = hybrid ? 0.7 : 1;
  const edge = new LineMaterial({ color: hybrid ? PAPER_DEEP : INK, linewidth: hybrid ? 1.1 : 1.6, transparent: true, opacity: edgeOpacity });
  const hidden = new LineMaterial({ color: INK, linewidth: 1, dashed: true, dashSize: 0.45, gapSize: 0.35, transparent: true, opacity: 0.38, depthWrite: false });
  hidden.depthFunc = THREE.GreaterDepth;
  const seam = new THREE.LineBasicMaterial({ color: hybrid ? PAPER_DEEP : INK, transparent: true, opacity: hybrid ? 0.2 : 0.1, depthWrite: false });
  return { fills, edge, hidden, seam, edgeOpacity };
}

function paint(look: Look, palette: Palette) {
  for (const k of PALETTE_KEYS) {
    const c = look.fills[k].color.set(palette[k]);
    if (isLit(k)) c.multiplyScalar(HDR);
  }
}

function dispose(look: Look) {
  for (const m of [...Object.values(look.fills), look.edge, look.hidden, look.seam]) m.dispose();
}

/* ---------- exploded view ---------- */

/** Where each part travels in the exploded view, in voxels; the whole model lifts so the legs stay above the floor. */
const EXPLODE: Record<PartName, [number, number, number]> = {
  head: [0, 7, 0], torso: [0, 0, 0], armL: [-6, 0.5, 0], armR: [6, 0.5, 0], legL: [-2.5, -4, 0], legR: [2.5, -4, 0],
};
const EXPLODE_LIFT = 5;
/**
 * The engine scatters parts across a 256-wide stage; the 3D frame is much tighter. Horizontal scatter is compressed
 * and half of it turned into depth (alternating per part), vertical motion is kept so parts still land on the floor.
 */
const SCATTER_X = 0.4, SCATTER_Z = 0.3;
/**
 * Balloon position relative to the part's pivot, and the depth of the part's front face where the leader starts.
 * Offsets of the form (a, b, −a) read as pure horizontal a and vertical b in the isometric view, so the balloons fan out.
 */
const BALLOON: Record<PartName, { at: [number, number, number]; front: number }> = {
  head: { at: [7.5, 4, -7.5], front: 5 }, torso: { at: [-7.5, 0, 7.5], front: 4 },
  armL: { at: [-3.5, 3.7, 3.5], front: 1 }, armR: { at: [4, 2.5, -4], front: 1 },
  legL: { at: [-3.5, -3.7, 3.5], front: 2 }, legR: { at: [3.5, -3.7, -3.5], front: 2 },
};

function Callout({ part }: { part: PartName }) {
  const t = useT();
  const { at, front } = BALLOON[part];
  return (
    <>
      <Line points={[[0, 0, front], at]} color={INK} lineWidth={1} transparent opacity={0.85} />
      <mesh position={[0, 0, front + 0.02]}>
        <circleGeometry args={[0.22, 12]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <Label kind="callout" position={at} n={PART_ORDER.indexOf(part) + 1}>{t(`part.${part}`)}</Label>
    </>
  );
}

/* ---------- parts ---------- */

interface PartRefs { group: THREE.Group | null; frames: Record<string, THREE.Group | null> }

function Frame({ mesh, look, mode, seams, onRef }: { mesh: VoxelMesh; look: Look; mode: RenderMode; seams: boolean; onRef: (g: THREE.Group | null) => void }) {
  const g = frameGeometry(mesh);
  const lines = useMemo(() => {
    const edge = new LineSegments2(g.edges, look.edge);
    const hidden = new LineSegments2(g.edges, look.hidden);
    hidden.computeLineDistances();
    hidden.renderOrder = 1; edge.renderOrder = 2;
    return { edge, hidden };
  }, [g, look]);
  return (
    <group ref={onRef}>
      {g.faces.map(([k, geo]) => <mesh key={k} geometry={geo} material={look.fills[k]} />)}
      {mode !== 'prototype' && <primitive object={lines.edge} />}
      {mode === 'blueprint' && <primitive object={lines.hidden} />}
      {seams && mode !== 'prototype' && <lineSegments geometry={g.seams} material={look.seam} />}
    </group>
  );
}

function Part({ part, look, mode, seams, exploded, refs }: { part: PartName; look: Look; mode: RenderMode; seams: boolean; exploded: boolean; refs: PartRefs }) {
  const [px, py] = PIVOTS[part];
  return (
    <group ref={g => { refs.group = g; }}>
      <group position={[-px, -py, 0]}>
        {Object.entries(MODEL[part]).map(([name, mesh]) => (
          <Frame key={name} mesh={mesh} look={look} mode={mode} seams={seams} onRef={g => { refs.frames[name] = g; }} />
        ))}
      </group>
      {exploded && <Callout part={part} />}
    </group>
  );
}

/* ---------- the twin ---------- */

/** Negative priorities run before the default 0 without taking over rendering, so the twin moves before anything reads it. */
const TWIN_FIRST = -2;

const easeInOut = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

export function Paket3D() {
  const { palette, renderMode, finish, showSeams, showDims, exploded } = useShowcase(useShallow(s => ({
    palette: s.palette, renderMode: s.renderMode, finish: s.finish, showSeams: s.showSeams, showDims: s.showDims, exploded: s.exploded,
  })));
  const look = useMemo(() => makeLook(renderMode, finish), [renderMode, finish]);
  useEffect(() => () => dispose(look), [look]);
  useEffect(() => paint(look, palette), [look, palette]);

  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const dims = useRef<THREE.Group>(null);
  const parts = useMemo(() => Object.fromEntries(PART_ORDER.map(p => [p, { group: null, frames: {} }])) as unknown as Record<PartName, PartRefs>, []);
  const clock = useRef(0);

  useFrame((_, dt) => {
    if (!root.current || !spin.current || !body.current) return;
    const pose = paket.getPose();
    const { state, effect } = paket.getState();

    // intro: the flat sprite is drawn first, then it extrudes into depth
    if (twin.extrude < 1) {
      clock.current += dt;
      const t = clock.current;
      look.edge.opacity = Math.min(1, t / 0.6) * look.edgeOpacity;
      twin.extrude = easeInOut(Math.min(1, Math.max(0, (t - 0.9) / 1.6)));
    } else look.edge.opacity = look.edgeOpacity;
    look.hidden.visible = twin.extrude > 0.6;

    const e = (twin.explode = reducedMotion ? +exploded : damp(twin.explode, +exploded, 5, dt));
    const lift = toSceneY(pose.y);
    root.current.position.set(toSceneX(pose.x) + CENTRE, lift + CENTRE + EXPLODE_LIFT * e, 0);
    root.current.visible = pose.opacity > 0.3;
    const moving = state === 'walk' || state === 'jump' || state === 'fall';
    root.current.rotation.y = damp(root.current.rotation.y, moving ? pose.facing * 0.4 : 0, 6, dt);
    spin.current.rotation.z = -pose.rot * DEG;
    const s = Math.max(0.001, pose.scale);
    body.current.scale.set(pose.facing * pose.sx * s, pose.sy * s, pose.sx * s * Math.max(0.05, twin.extrude));

    PART_ORDER.forEach((part, i) => {
      const r = parts[part];
      if (!r.group) return;
      const p = pose.parts[part], [px, py] = PIVOTS[part], away = EXPLODE[part];
      r.group.position.set(px + p.dx * SCATTER_X + away[0] * e, py - p.dy + away[1] * e, p.dx * SCATTER_Z * (i % 2 ? 1 : -1) + away[2] * e);
      r.group.rotation.z = -p.rot * DEG;
      for (const name in r.frames) { const f = r.frames[name]; if (f) f.visible = name === p.frame; }
    });
    if (dims.current) dims.current.visible = twin.extrude >= 1 && e < 0.05 && !effect;

    twin.x = root.current.position.x; twin.y = root.current.position.y; twin.lift = lift;
  }, TWIN_FIRST);

  return (
    <group
      ref={root}
      onClick={e => { if (e.delta < 4) { e.stopPropagation(); paket.effect('jelly'); } }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <group ref={spin}>
        <group ref={body} position={[0, -CENTRE, 0]}>
          {PART_ORDER.map(part => (
            <Part key={part} part={part} look={look} mode={renderMode} seams={showSeams} exploded={exploded} refs={parts[part]} />
          ))}
        </group>
      </group>
      {showDims && <group ref={dims}><Dimensions /></group>}
    </group>
  );
}
