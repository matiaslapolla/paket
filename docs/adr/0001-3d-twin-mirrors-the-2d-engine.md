# 1. The 3D twin mirrors the 2D engine instead of reimplementing it

Date: 2026-10-06. Status: accepted.

## Context

The blueprint showcase needs Paket to walk, jump, disassemble and react in 3D. The 2D engine in `src/core.ts`
already owns physics, the state machine, presets, effects, keyboard and drag, but it only renders SVG and keeps
its per-frame render values private.

## Decision

Add `getPose(): PaketPose` to `PaketController`. It returns what the last render drew: the visible frame of each
part, each part's effect offset and rotation, the position, facing, squash and stretch, global rotation, scale and
opacity. The showcase runs one real engine (its SVG shown as the "source" panel) and maps that pose onto the voxel
model every animation frame.

## Consequences

- One implementation of motion. A new preset or effect in the library appears in 3D without showcase changes.
- Any other renderer (canvas, WebGL, native) can mirror the engine the same way.
- 3D-only motion (intro extrusion, exploded view, turntable, yaw toward the travel direction) is layered on top
  of the pose, never written back into the engine.
- The engine keeps running its SVG even when only the 3D view matters; the cost is one small SVG per page.
