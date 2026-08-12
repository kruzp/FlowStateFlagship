import * as THREE from 'three';

/**
 * Renderer owns the WebGL2 context, the Three.js renderer instance, and the
 * scene/camera used to draw a fullscreen quad.
 *
 * It knows nothing about fluid simulation — this is pure harness code.
 * Later milestones can read simulation textures into the material this class
 * draws, but this class should never reach into simulation internals.
 */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly webgl2Supported: boolean;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);

    this.webgl2Supported = this.checkWebGL2Support();

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      -1,
      1,
      1,
      -1,
      0,
      1
    );

    if (this.webgl2Supported) {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      });

      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
      );
    }
  }

  /**
   * Explicit capability check, separate from letting Three.js silently pick
   * whatever context it can get.
   *
   * The fluid solver requires WebGL2 for its float render targets.
   */
  private checkWebGL2Support(): boolean {
    try {
      const ctx = this.canvas.getContext('webgl2');
      return ctx !== null;
    } catch {
      return false;
    }
  }

  get isReady(): boolean {
    return this.renderer !== null;
  }

  /**
   * Exposes the underlying THREE.WebGLRenderer so GPGPU/Simulation can run
   * offscreen passes.
   *
   * Callers should only use this for rendering purposes. Scene and camera
   * ownership stays inside Renderer.
   */
  get webgl(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  resize(width: number, height: number): void {
    if (!this.renderer) return;

    this.renderer.setSize(width, height, false);
  }

  render(): void {
    if (!this.renderer) return;

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer?.dispose();
    this.renderer = null;
  }
}