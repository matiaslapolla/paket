# Plan: blueprint showcase

Spec: `docs/specs/blueprint-showcase.md`. ADR: `docs/adr/0001-3d-twin-mirrors-the-2d-engine.md`.

1. Engine: `getPose()` in `src/core.ts`, README entry. Commit.
2. Scaffold `showcase/` (Vite, React 19, R3F, drei, postprocessing, zustand, fontsource; typecheck, lint, vitest).
   Shared contracts: `store.ts`, `engine.ts`, `i18n.ts`, `styles.css` tokens. Commit.
3. Model: `model/voxels.ts` (sprite → voxels → faces, feature edges, construction edges, stats) with tests. Commit.
4. In parallel:
   - Scene (lead): `scene/` Stage, Paket3D, Dimensions, Callouts, Platforms, post-processing, exporters, intro.
   - HUD (subagent): `ui/` sheet frame, title block, motion/view/customise panels, 2D source panel, BOM,
     language toggle, mobile bottom sheet; all strings in `i18n.ts`.
5. Integrate in `App.tsx`; verify in Chromium at desktop and 375 px; check reduced motion and network.
6. Review pass (fresh-context subagent), one fix round, gate, commit.
