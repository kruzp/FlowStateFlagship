# core/

Reserved for the simulation engine — knows nothing about color, input, or
rendering. Populated across milestones 1–6:

- `GPGPU.ts` — ping-pong render target helper (milestone 1)
- `fields/VelocityField.ts`, `fields/DyeField.ts` (milestones 2–3)
- `Simulation.ts` — owns the frame loop: splat → advect → project → advect dye
- `shaders/` — splat, advect, curl, vorticity confinement, divergence,
  pressure Jacobi, gradient subtract

Intentionally empty until milestone 1 (render targets / ping-pong system) begins.
