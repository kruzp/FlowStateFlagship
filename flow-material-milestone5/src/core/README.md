# core/

The simulation engine — knows nothing about color, input, or rendering.

- `GPGPU.ts` — ping-pong render target helper ✅
- `fields/VelocityField.ts`, `fields/DyeField.ts` ✅
- `Simulation.ts` — owns the frame loop: ambient force → vorticity
  confinement → pressure projection → advection (velocity, then dye) ✅
- `shaders/` — curlForce (ambient), splat, vorticity, confinement, advect,
  divergence, pressure, gradientSubtract ✅

Pipeline order matters: forces (ambient + injected) are added first,
vorticity confinement reinforces any rotation those forces created, THEN
the field is projected to be divergence-free, and only then advected. This
is the standard real-time stable-fluids order — projecting before advection
is what makes injected energy roll into swirls instead of a linear smear.
