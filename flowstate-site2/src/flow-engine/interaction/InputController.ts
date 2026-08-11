/** A generic pointer movement sample — deliberately has no fluid-simulation vocabulary. */
export interface PointerSample {
  x: number; // normalized 0..1, origin bottom-left (matches GL/uv convention)
  y: number;
  dx: number; // normalized delta since the previous sample
  dy: number;
  strength: number; // 0..1, derived from movement speed
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

    if (this.hasLast) {
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      const speed = Math.hypot(dx, dy);
      const strength = Math.min(speed * 10, 1);

      if (strength > 0.0005) {
        this.queue.push({ x, y, dx, dy, strength });
      }
    }

    this.lastX = x;
    this.lastY = y;
    this.hasLast = true;
  };

  private handlePointerLeave = (): void => {
    this.hasLast = false;
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
