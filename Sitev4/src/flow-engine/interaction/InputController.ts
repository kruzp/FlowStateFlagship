/** A generic pointer movement sample — deliberately has no fluid-simulation vocabulary. */
export interface PointerSample {
  x: number; // normalized 0..1, origin bottom-left (matches GL/uv convention)
  y: number;
  dx: number; // normalized delta since the previous sample
  dy: number;
  strength: number; // 0..1, derived from movement speed
  acceleration: number; // 0..1, derived from the change in speed since the previous sample
}

/**
 * InputController's only job is DOM events -> normalized movement samples.
 * It knows nothing about velocity fields, dye, or splats — ForceInjector
 * is the translation layer that turns these samples into physical impulses.
 * This keeps the simulation core reusable for input sources that don't
 * exist yet (touch gestures, ambient sensors, programmatic triggers, etc).
 */
export class InputController {
  private element: HTMLElement;
  private lastX = 0.5;
  private lastY = 0.5;
  private hasLast = false;
  private lastSpeed = 0;
  private lastTime = 0;
  private queue: PointerSample[] = [];

  constructor(element: HTMLElement) {
    this.element = element;
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerleave', this.handlePointerLeave);
  }

  private handlePointerMove = (event: PointerEvent): void => {
    const rect = this.element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    const now = performance.now();

    if (this.hasLast) {
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      const speed = Math.hypot(dx, dy);
      const strength = Math.min(speed * 10, 1);

      // Rate of change of speed, not speed itself — this is what lets a
      // sudden flick read as a stronger disturbance than steady fast motion
      // at the same instantaneous speed. Floor dt so a near-zero interval
      // between events (possible on high-polling-rate devices) can't blow
      // this up toward infinity.
      const dt = Math.max(now - this.lastTime, 4) / 1000;
      const speedDelta = (speed - this.lastSpeed) / dt;
      const acceleration = Math.min(Math.max(speedDelta * 0.05, 0), 1);

      if (strength > 0.0005) {
        this.queue.push({ x, y, dx, dy, strength, acceleration });
      }

      this.lastSpeed = speed;
    }

    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;
    this.hasLast = true;
  };

  private handlePointerLeave = (): void => {
    this.hasLast = false;
    this.lastSpeed = 0;
  };

  /** Returns and clears all samples collected since the last call. */
  consume(): PointerSample[] {
    if (this.queue.length === 0) return this.queue;
    const samples = this.queue;
    this.queue = [];
    return samples;
  }

  dispose(): void {
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerleave', this.handlePointerLeave);
  }
}
