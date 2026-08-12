# interaction/

Reserved for translating raw input (pointer, touch, idle timer) into generic
force impulses the simulation core can consume, without the core ever
knowing where the impulse came from.

- `InputController.ts` — pointer/touch/idle → `{ x, y, dx, dy, strength }`
- `ForceInjector.ts` — feeds impulses into `Simulation.splat()`

Populated at milestone 5 (external force injection).
