# materials/

Reserved for the configurable color-identity layer — the only layer that
changes per Flow Material. Reads simulation field values (velocity, vorticity,
dye density); the simulation core never imports from here.

- `MaterialDefinition.ts` — typed config schema (base color, accent curves,
  thresholds, saturation ceiling, etc.)
- `presets/flowstateInk.ts` — first concrete preset: near-black base with
  velocity-driven green and vorticity-driven blue accents
- `colorResponse.frag` — reads velocity + vorticity + dye, outputs final color

Populated at milestone 7 (material rendering).
