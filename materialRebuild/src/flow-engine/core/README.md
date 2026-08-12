# core/

Reserved for the simulation engine — knows nothing about color, input, or
rendering.

- `GPGPU.ts` — ping-pong render target helper
- `fields/VelocityField.ts`, `fields/DyeField.ts` — double-buffered storage
- `Simulation.ts` — owns the frame loop: ambient force → curl → vorticity
  confinement → divergence → pressure (Jacobi) → gradient subtract →
  advect velocity → advect dye. Splats (cursor-driven impulses) are
  applied externally via `splat()` before `step()` runs each frame.
- `shaders/` — `curlForce` (ambient/autonomous motion, unrelated to fluid
  vorticity despite the name), `curl` (measures the velocity field's own
  rotation), `vorticityConfinement` (feeds energy back into that rotation
  so it survives the pressure solve), `splat`, `advect`, `divergence`,
  `pressure` (Jacobi), `gradientSubtract`

Pipeline order matters here: velocity is only self-advected *after*
pressure projection, so the field entering advection is already
divergence-free (Stam/Fedkiw stable fluids order) — advecting first and
projecting after would let slightly-compressible velocity get carried
around before it's cleaned up.
