# Blueprint showcase: Paket's 3D voxel twin

## Why

A manufacturer is looking at Paket. The repo only shows a 16×16 SVG sprite, which says nothing about the object
they would make. This page shows Paket as a physical object: a 3D model they can turn, take apart, recolour, size
in millimetres and download, presented as the technical drawing a factory actually reads.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Where | `showcase/`, its own Vite app with its own `package.json` | The library stays dependency-free; the showcase can pull in WebGL without touching it. |
| 3D stack | three.js through React Three Fiber, drei (CameraControls, Html, Grid, Lightformer environment), `@react-three/postprocessing` | The most mature web 3D stack; React matches the library's own wrapper. |
| State | zustand | One small store shared by the WebGL scene and the HUD without prop drilling. |
| The model | Generated at runtime from `src/sprite.ts`: each sprite pixel becomes a voxel column with a per-part depth profile | One source of truth. Editing the sprite edits the 3D model and the STL. No hand modelling. |
| Motion | The real 2D engine (`createPaket`) runs in a HUD panel and the 3D twin mirrors it every frame through a new `getPose()` API | Presets, effects, keyboard and drag come from the product itself instead of a second implementation. See ADR 0001. |
| Network | Zero runtime requests to third parties: fonts self-hosted with `@fontsource`, no HDRI downloads, no CDN fonts in drei `Text` | The audience is in mainland China, where Google Fonts and GitHub-hosted assets are blocked or slow. |
| Language | English and Simplified Chinese, toggle in the HUD, defaults from `navigator.language` | The audience. |

## The model

- Grid: sprite column `s` → `X = s − 8`; sprite row `t` → `Y = 14 − t` (feet on `Y = 0`); depth `Z` centred on 0.
- Depth profile per part: head rows 1/2/3–7 are 6/8/10 deep (stepped dome); torso 8; legs 4; arms 2.
- The visor is recessed one voxel; eyes and alert glow sit flush with the front face and are emissive.
- Every pose frame of every part in `PARTS` becomes its own geometry; the twin shows the frame the engine shows.
- Edges for the line drawing are feature edges only: a voxel-face edge is drawn unless the face continues coplanar
  with the same palette key on the other side.
- Physical size: one voxel = `pitch` mm (default 5). Default pose overall: 14 × 14 × 10 voxels.

## Features

1. Full-viewport WebGL scene on a blueprint sheet: blue paper, floor grid in voxel units, sheet border, title block.
2. Intro: the flat sprite is drawn in lines, then extrudes into the voxel twin while the camera moves from the front
   view to the iso view. Under `prefers-reduced-motion` the final state renders directly.
3. Render modes: **Blueprint** (white feature lines, dashed hidden lines, faint tinted fill), **Prototype** (solid
   painted plastic), **Hybrid** (solid plus ink lines).
4. Views: ISO, FRONT, SIDE, TOP; perspective ↔ orthographic-like via a dolly zoom; turntable.
5. Live motion mirrored from the engine: all `PRESETS`, all effects (disassemble, blackhole, jelly, glitch, reset),
   arrow keys / WASD / space, drag-and-throw on the 2D source panel, scene switching with platforms in 3D.
6. Exploded view: parts move apart along assembly axes, numbered balloons with leader lines, bill of materials.
7. Customisation: the five palette colours, colourway presets, surface finish (matte, gloss, metal), production
   material (ABS, PLA, resin, zinc alloy) for the mass estimate, voxel pitch in mm.
8. Dimensions: overall width, height, depth with extension lines and mm labels that follow the pitch.
9. Export: STL (binary, default pose, mm), GLB (coloured, one node per part), PNG of the current view.
10. Responsive: usable at 375 px wide; HUD collapses into a bottom sheet.

## Out of scope

Editing voxels in the browser, physically-based packaging renders, a backend, deploying.

## Contracts between the scene and the HUD

- `showcase/src/store.ts`: the only shared UI state (render mode, view, palette, pitch, toggles, language).
- `showcase/src/engine.ts`: the single `PaketController`, its detached SVG host (the HUD mounts it), and
  `useEngineStatus()` for the active preset/effect.
- `showcase/src/i18n.ts`: `useT()` and the string tables; every visible string goes through it.
- `showcase/src/scene/exporters.ts`: `exportSTL()`, `exportGLB()`, `exportPNG()`.
- `showcase/src/model/voxels.ts`: `modelStats(pitch, material)` for the title block and BOM numbers.

## Design tokens

Defined once in `showcase/src/styles.css`. Paper `oklch(0.31 0.105 258)`, surface `oklch(0.27 0.09 258)`,
ink `oklch(0.96 0.015 245)`, muted ink `oklch(0.80 0.05 245)`, hairline `oklch(0.85 0.05 245 / 0.35)`,
one accent (markup amber) `oklch(0.83 0.14 78)` meaning "selected / active". IBM Plex Sans for UI and prose,
IBM Plex Mono only for numbers, codes and dimensions. Radius 2 px. No shadows, no blur: elevation is a surface step
plus a hairline.

## Acceptance criteria

- [ ] `pnpm --dir showcase typecheck`, `lint`, `test` and `build` pass.
- [ ] The 3D model is generated from `src/sprite.ts` at runtime; no model files are committed.
- [ ] `getPose()` exists on `PaketController`, is documented in the README, and the 2D demo behaviour is unchanged.
- [ ] Every preset and effect started from the HUD plays in the 2D source panel and in the 3D twin at the same time.
- [ ] Arrow keys move Paket in both views; dragging the 2D sprite moves the 3D twin.
- [ ] Blueprint, Prototype and Hybrid modes render; Blueprint shows hidden edges dashed.
- [ ] ISO, FRONT, SIDE and TOP views animate the camera; the orthographic toggle flattens perspective.
- [ ] Exploded view shows six numbered parts with leader lines and a BOM with voxel count, volume and mass.
- [ ] Changing a palette colour recolours the 2D sprite and the 3D twin.
- [ ] Changing the pitch updates the dimension labels, title block and BOM.
- [ ] STL, GLB and PNG downloads produce non-empty files; the STL opens as a closed mesh in mm.
- [ ] The language toggle switches every visible HUD string between English and Simplified Chinese.
- [ ] The production build makes no network request outside its own origin.
- [ ] At 375 px wide there is no horizontal scroll and all controls are reachable.
- [ ] With `prefers-reduced-motion: reduce` the intro and turntable do not animate.
