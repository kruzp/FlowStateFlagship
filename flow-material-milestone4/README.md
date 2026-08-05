# Flow Material v2.0 — Milestone 2: Fluid Solver Core

Milestone 1 proved the environment (canvas, context, animation loop,
resize, shader pipeline). Milestone 2 replaces the placeholder quad with a
real, running physics simulation: a persistent autonomous resting state,
cursor-driven force + dye injection, propagation via advection, settling
via dissipation, vorticity confinement (so injected energy rolls into
ink/smoke-like swirls instead of a linear smear), and pressure projection
for incompressibility — plus the real `materials/` color-identity layer
(green from velocity, blue from vorticity, teal wherever they overlap).

This milestone folds together what the original roadmap below listed as
steps 1–7 into one coherent, working solver + display, since none of them
produce believable motion or color in isolation.

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
- `core/Simulation.ts` — owns the frame loop, in order: ambient curl force
  → vorticity measurement + confinement → pressure projection (divergence
  → Jacobi solve → gradient subtract) → advect velocity → advect dye. The
  only class that knows the physical steps
- `core/shaders/` — curlForce, splat, vorticity, confinement, advect,
  divergence, pressure, gradientSubtract — each a single-responsibility
  GLSL pass
- `interaction/InputController.ts` — DOM pointer events → normalized,
  simulation-agnostic samples
- `interaction/ForceInjector.ts` — the only bridge from input into
  `Simulation.splat()`; decides impulse strength, never touches rendering
- `materials/` — the real color-identity layer: `MaterialDefinition.ts`
  (typed config), `presets/flowstateInk.ts` (near-black base, green/blue
  accents), `shaders/colorResponse.frag.glsl` (reads velocity + vorticity
  + dye, teal emerges wherever green and blue overlap)
- `App.ts` orchestrates these layers only — no physics, input-translation,
  or color-identity logic lives in it
- Resting-state motion is continuous and autonomous (ambient curl-noise
  force runs every frame, cursor or not); cursor movement injects energy
  that rolls into swirls, propagates, and settles rather than moving the
  material directly

## Roadmap

1. ~~Render targets + GPU ping-pong system~~ — `core/GPGPU.ts` ✅
2. ~~Velocity field~~ — `core/fields/VelocityField.ts` ✅
3. ~~Dye field~~ — `core/fields/DyeField.ts` ✅
4. ~~Advection~~ — `core/shaders/advect.frag` ✅
5. ~~External force injection~~ — `interaction/` ✅
6. ~~Pressure projection~~ — `core/shaders/{divergence,pressure,gradientSubtract}.frag` ✅
7. ~~Material rendering~~ — `materials/` ✅

Next up: tuning (dissipation, curl strength, color scales) by feel against
the running material, and additional presets as more Flowstate surfaces
need this engine.
