# Flowstate — flagship site

Vite + TypeScript + Three.js. The Flow Material engine (GPGPU fluid
solver, interaction layer, renderer) lives untouched in
`src/flow-engine/{core,interaction,render}` — copied verbatim from the
supplied Flow Material v2.0 (Milestone 2) package. `src/flow-engine/app/FlowHero.ts`
is the only new orchestration code: it mounts the engine into the hero
container instead of the full page, adds container-based resize (via
ResizeObserver), pauses the render loop on tab-hide, respects
`prefers-reduced-motion`, and lowers grid resolution on small viewports.

Note: the display shader used is still the engine's own
`debugDisplay.frag.glsl` — the real color-identity material (milestone 7
in the engine's own roadmap) hasn't been built yet. It happens to already
land close to Flowstate's palette (green dye, teal/blue from velocity on
a near-black base), so it reads as intentional today. No shader code was
changed; the only "polish" layered on is CSS (scrim, vignette) so hero
text stays legible over it. When the real material lands, it drops into
`FlowHero.ts` as a one-line swap of `debugDisplayShader`.

## Run

```
npm install
npm run dev      # dev server
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

## Structure

- `index.html` — full page markup (nav, hero, sections, footer)
- `src/style.css` — design tokens + layout (single stylesheet)
- `src/main.ts` — boots FlowHero, nav state, HUD readout, scroll reveals
- `src/flow-engine/` — the Flow Material engine (core/interaction/render
  copied verbatim) + `app/FlowHero.ts` (new hero-container orchestrator)

## Known placeholder

The contact email in `index.html` (`hello@flowstate.systems`) is a
placeholder — swap for the real inbox before this goes live.
