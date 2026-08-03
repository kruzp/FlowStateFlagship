# Flow Material v2.0 — Milestone 1: Foundation

Three.js + TypeScript + WebGL2 harness. No fluid simulation yet — this
milestone only proves the environment itself: canvas, context, animation
loop, resize, and the shader pipeline the real material will later use.

## Install

You need Node.js installed (LTS, v18 or newer). Check with:

```
node -v
```

If that fails, install Node from https://nodejs.org (the LTS installer),
or via a version manager (`nvm install --lts`) if you prefer.

From the project folder:

```
npm install
```

This pulls in three.js, TypeScript, and Vite — nothing else. No paid
dependencies, no API keys, no accounts required.

## Run

```
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`). Open it —
you should see a fullscreen near-black canvas with a very subtle slow green
pulse. That pulse is deliberate: it's the shader pipeline proving it
compiles and receives per-frame uniforms, not the real material.

## What this milestone verifies

- Vite project structure and TypeScript compile cleanly
- Canvas is created and mounted, fills the viewport
- WebGL2 context is explicitly checked (not just assumed) — if unsupported,
  the page shows a fallback message instead of a blank/broken canvas
- Animation loop runs via `requestAnimationFrame`, driving a `uTime` uniform
- Resize is handled — try resizing the browser window, the canvas should
  fill it with no stretching or stale sizing
- Folder architecture matches the v2.0 spec, with `core/`, `interaction/`,
  and `materials/` present but empty (each has a README noting what lands
  there and at which milestone)

## Do NOT extend this milestone's files in place

`App.ts`'s placeholder quad and shader exist only to prove the pipeline.
When milestone 2 begins, the ping-pong render target system goes in
`core/GPGPU.ts`, not bolted onto `App.ts`. `App.ts` will be rewired to read
from the simulation once it exists, not grown incrementally into it.

## Roadmap (unimplemented, for reference)

1. Render targets + GPU ping-pong system — `core/GPGPU.ts`
2. Velocity field — `core/fields/VelocityField.ts`
3. Dye field — `core/fields/DyeField.ts`
4. Advection — `core/shaders/advect.frag`
5. External force injection — `interaction/`
6. Pressure projection — `core/shaders/{divergence,pressureJacobi,gradientSubtract}.frag`
7. Material rendering — `materials/`
