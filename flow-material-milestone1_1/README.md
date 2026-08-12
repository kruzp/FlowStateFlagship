# Flow Material v2.0 — Milestone 2: Fluid Solver Core

Milestone 1 proved the environment (canvas, context, animation loop,
resize, shader pipeline). Milestone 2 replaces the placeholder quad with a
real, running physics simulation: a persistent autonomous resting state,
cursor-driven force + dye injection, propagation via advection, and
settling via dissipation — all made physically coherent by a full
pressure-projection step (divergence → Jacobi solve → gradient subtract),
so the field is incompressible and swirls rather than just diffusing.

This milestone folds together what the original roadmap below listed as
steps 1–6 (GPGPU, fields, advection, force injection, pressure projection)
into one coherent solver, since none of them produce believable motion in
isolation — advection without projection just blurs and drifts. Step 7
(the real color-identity material) is still deliberately deferred; what
you see right now is a temporary debug visualization
(`render/shaders/debugDisplay.frag.glsl`), not the Flowstate palette.

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

- `core/GPGPU.ts` — generic ping-pong render target helper, no physics
  knowledge; reused for every field in the solver
- `core/fields/{VelocityField,DyeField}.ts` — typed double-buffered storage
- `core/Simulation.ts` — owns the frame loop: ambient curl force → advect
  (propagation + settling) → divergence → Jacobi pressure solve → gradient
  subtract → dye advection. The only class that knows the physical steps
- `core/shaders/` — curlForce, splat, advect, divergence, pressure,
  gradientSubtract — each a single-responsibility GLSL pass
- `interaction/InputController.ts` — DOM pointer events → normalized,
  simulation-agnostic samples
- `interaction/ForceInjector.ts` — the only bridge from input into
  `Simulation.splat()`; decides impulse strength, never touches rendering
- `App.ts` rewired to orchestrate these layers plus a temporary debug
  display shader — no physics or input logic lives in `App.ts` itself
- Resting-state motion is continuous and autonomous (ambient curl-noise
  force runs every frame, cursor or not); cursor movement injects energy
  that propagates and settles rather than moving the material directly

## Do NOT extend this milestone's files in place

The debug display shader (`render/shaders/debugDisplay.frag.glsl`) and its
wiring in `App.ts` exist only to make the solver visible. When milestone 3
(materials/, the real color-identity layer) begins, that shader is
deleted and replaced by `materials/colorResponse.frag` reading the same
dye/velocity textures — not grown in place.

## Roadmap

1. ~~Render targets + GPU ping-pong system~~ — `core/GPGPU.ts` ✅
2. ~~Velocity field~~ — `core/fields/VelocityField.ts` ✅
3. ~~Dye field~~ — `core/fields/DyeField.ts` ✅
4. ~~Advection~~ — `core/shaders/advect.frag` ✅
5. ~~External force injection~~ — `interaction/` ✅
6. ~~Pressure projection~~ — `core/shaders/{divergence,pressure,gradientSubtract}.frag` ✅
7. Material rendering — `materials/` (next up)
