# PAKET

An 8-bit companion made to bring your SaaS to life. A small robot that lives in your app's UI: it walks, jumps, gets
picked up and thrown, reacts to what your product is doing, and falls apart and puts itself back together when you ask it to.

A dependency-free TypeScript engine (`src/core.ts`) plus a React wrapper (`src/react/Paket.tsx`). It renders to SVG
(`shape-rendering: crispEdges`) and ships its own physics, state machine, effects, drag and keyboard input.

```
src/
  sprite.ts        pixels per part (head, torso, two arms, two legs) and poses
  core.ts          createPaket(host, options) → PaketController
  scenes.ts        example SCENES and PRESETS (replace them with your own)
  react/Paket.tsx  <Paket /> with a ref to the controller
  index.ts         exports
demo/demo.ts       the playground page, built on the public API
```

## React

```tsx
import { useRef } from 'react';
import { Paket, SCENES, PRESETS, type PaketController } from './paket';

export function Sidebar() {
  const pet = useRef<PaketController>(null);
  return (
    <>
      <Paket
        ref={pet}
        scenes={SCENES}
        scene="4"                       // 'Vacío' (empty), or your own Scene object
        palette={{ body: '#24c1c7' }}   // partial; the rest keeps its default
        world={{ width: 160, height: 90, ground: 80 }}
        keyboard={{ target: 'host' }}   // only while the host has focus, so it never steals keys from your app
        draggable
        onEvent={e => e.type === 'land' && e.impact > 150 && console.log('hard landing')}
        style={{ width: 240 }}
      />
      <button onClick={() => pet.current?.effect('jelly')}>notification</button>
      <button onClick={() => pet.current?.play(PRESETS.nightShift)}>waiting mode</button>
    </>
  );
}
```

The ref is the way to wire it into your product: `pet.current.effect('blackhole')` on sign-out, `pet.current.play(...)`
while a job runs, `pet.current.setInput({ right: true })` to move it from code. The `preset` and `effect` props also work
declaratively: they fire whenever their value changes.

## Without React

```ts
import { createPaket, SCENES, PRESETS } from './paket';
const pet = createPaket(document.querySelector('#pet')!, { scene: SCENES['2'], scenes: SCENES });
pet.play(PRESETS.patrol);
pet.destroy();
```

## Options (`PaketOptions`)

| Option | Controls | Default |
| --- | --- | --- |
| `palette` | `body`, `shade`, `visor`, `eye`, `glow` | Senda palette |
| `colors` | the scene's `bg`, `surface`, `line`, `lineStrong`, `muted` | dark Senda |
| `world` | `width`, `height`, `ground` in pixel units (the sprite is 16) | 256×144, ground at 128 |
| `physics` | `walk`, `run`, `accel`, `jump`, `doubleJump`, `maxJumps`, `gravity`, `throwScale`, `maxThrow`, `bounce` | see `DEFAULTS` |
| `jelly` | the spring: `stiffness`, `damping` and the `land`, `jump`, `poke`, `drop` impulses | see `DEFAULTS` |
| `timings` | effect durations, blink interval, walk/run fps | see `DEFAULTS` |
| `scene` / `scenes` | the active scene and the scene dictionary (number keys use its keys) | empty |
| `draggable` | drag with mouse or touch, release with momentum | `true` |
| `pokeOnClick` | a click without a drag = jelly | `true` |
| `keyboard` | `false`, or `{ target: 'host' \| 'window', map, extras }` | `{ target: 'host' }` |
| `start` | initial `x`, `y`, `facing` | `x: 24`, on the ground |
| `reducedMotion` | turns off blinking and the scene `tick` | follows `prefers-reduced-motion` |
| `onState`, `onEvent` | callbacks | — |

`maxJumps: 1` disables the double jump; `maxJumps: 3` gives a triple.

## Controller

`setInput`, `press`, `release`, `jump`, `face`, `teleport`, `setScene`, `getScene`, `play`, `stop`,
`effect`, `setPalette`, `setDraggable`, `getState`, `getPose`, `destroy`, and `svg` (the element, in case you want to style it).

`getPose()` returns what the last frame drew: each part's visible frame and effect offset, plus position, facing,
squash and stretch, rotation, scale and opacity. Another renderer can mirror the engine with it; the 3D showcase in
`showcase/` does exactly that.

## Effects

- `disassemble`: every part flies off with its own velocity and spin, bounces on the floor, and returns to its place.
- `blackhole`: the robot spins and shrinks until it disappears, then reappears somewhere else on the ground.
- `jelly`: an impulse to the scale spring (squash and stretch with rebound). Also used on landing, jumping, dropping and clicking.
- `glitch`: flicker, random jitter, and a position reset.
- `reset`: back to the start.

## Scenes

```ts
const mine: Scene = {
  name: 'Dashboard',
  platforms: [{ x: 40, y: 100, w: 30 }],
  draw(g, { el, world, palette, colors }) { g.appendChild(el('rect', { x: 0, y: 20, width: 40, height: 2, fill: colors.line })); },
  tick(g, t) { /* optional, every tickEvery seconds */ },
};
```

## Presets

A preset is a list of steps `{ ms, keys?, eyes?, effect? }`. It runs on the same physics as manual control, so anything
you can do with the keyboard you can record as a preset.

```ts
const wave: Preset = { name: 'Wave', steps: [{ ms: 400, eyes: 'left' }, { ms: 60, keys: { jump: true } }, { ms: 400, eyes: 'right' }], loop: 2 };
```

## Sprite

`sprite.ts` defines each part as pixels `[x, y, paletteKey]`. To change the design, edit the ASCII rows; arms are defined
for the left side and mirrored. The available poses per part are typed (`EyePose`, `LegPose`, `ArmPose`), so adding a new
pose forces you to decide which state uses it.

## Build

No bundler of its own: anything that compiles TS/TSX (Vite, Next, esbuild) takes it as is. The demo was built with
`esbuild demo/demo.ts --bundle --format=iife` and inlined into an HTML page.

## License

MIT. Use it, change it, ship it in your product; just keep the credit to [Matias Lapolla](https://matiaslapolla.com).
