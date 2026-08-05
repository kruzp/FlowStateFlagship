import * as THREE from 'three';

/**
 * GPGPU is pure infrastructure. It knows how to allocate ping-pong float
 * render targets and how to run a fullscreen shader pass into one, and
 * nothing else — it has no concept of velocity, dye, pressure, or any other
 * fluid-specific idea. FluidSolver (built on top of this) owns all of that.
 * This separation is what lets the same ping-pong mechanism be reused for
 * any future GPU field simulation, not just this one material.
 */

/** A double-buffered render target: read from one, write into the other, then swap. */
export class DoubleFBO {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;

  constructor(
    private width: number,
    private height: number,
    options: THREE.RenderTargetOptions,
  ) {
    this.read = new THREE.WebGLRenderTarget(width, height, options);
    this.write = new THREE.WebGLRenderTarget(width, height, options);
  }

  swap(): void {
    const temp = this.read;
    this.read = this.write;
    this.write = temp;
  }

  get texture(): THREE.Texture {
    return this.read.texture;
  }

  dispose(): void {
    this.read.dispose();
    this.write.dispose();
  }
}

export class GPGPU {
  private renderer: THREE.WebGLRenderer;
  private passScene: THREE.Scene;
  private passCamera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;

    // A dedicated offscreen scene/camera for running fullscreen passes.
    // Kept separate from anything that draws to the visible canvas.
    this.passScene = new THREE.Scene();
    this.passCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.passScene.add(this.quad);
  }

  /**
   * Half-float (RGBA16F) render targets, unconditionally. Linear-filtered
   * sampling of half-float textures is guaranteed by the WebGL2 core spec —
   * no extension check, no driver-dependent fallback. Full 32-bit float
   * textures need OES_texture_float_linear for linear sampling, and on
   * some platforms (notably macOS/Safari via ANGLE-Metal) that extension
   * can report as present while linear filtering of float render targets
   * still behaves inconsistently in practice — which reads as the whole
   * material looking hard-edged/blocky instead of soft. Half-float sidesteps
   * that gap entirely, and this simulation doesn't need 32-bit precision.
   */
  static preferredType(_renderer: THREE.WebGLRenderer): THREE.TextureDataType {
    return THREE.HalfFloatType;
  }

  createDoubleFBO(width: number, height: number, type: THREE.TextureDataType): DoubleFBO {
    return new DoubleFBO(width, height, {
      type,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    });
  }

  /**
   * Runs `material` as a fullscreen pass, rendering into `target`.
   * Pass `null` as the target to render to the visible canvas instead
   * (used for debug visualization, not for simulation steps).
   */
  pass(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
    this.quad.material = material;
    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.passScene, this.passCamera);
    this.renderer.setRenderTarget(prevTarget);
  }

  dispose(): void {
    this.quad.geometry.dispose();
  }
}
