# materials/

The configurable color-identity layer — the only layer that changes per
Flow Material variant. Reads simulation field values (velocity, vorticity,
dye density); the simulation core never imports from here.

- `MaterialDefinition.ts` — typed config schema (base color, accent colors,
  scale thresholds, dye gating) ✅
- `presets/flowstateInk.ts` — first concrete preset: near-black base with
  velocity-driven green and vorticity-driven blue accents that combine into
  teal wherever both are present ✅
- `shaders/colorResponse.frag.glsl` — reads velocity + vorticity + dye,
  outputs final color ✅

Still ahead: additional presets, and eventually per-client palette variants
once Flow Material is reused across other Flowstate surfaces.
