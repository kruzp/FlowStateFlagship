import * as THREE from 'three';
import { GPGPU } from './GPGPU';
import { VelocityField } from './fields/VelocityField';
import { DyeField } from './fields/DyeField';

import fullscreenVert from './shaders/fullscreen.vert.glsl?raw';
import curlForceFrag from './shaders/curlForce.frag.glsl?raw';
import curlFrag from './shaders/curl.frag.glsl?raw';
import vorticityConfinementFrag from './shaders/vorticityConfinement.frag.glsl?raw';
import splatFrag from './shaders/splat.frag.glsl?raw';
import advectFrag from './shaders/advect.frag.glsl?raw';
import divergenceFrag from './shaders/divergence.frag.glsl?raw';
import pressureFrag from './shaders/pressure.frag.glsl?raw';
import gradientSubtractFrag from './shaders/gradientSubtract.frag.glsl?raw';

export interface SimulationConfig {
  /** Simulation grid resolution along the longer axis. Lower = faster, softer. */
  simResolution: number;
  /** Dye/display resolution along the longer axis. Can exceed simResolution. */
  dyeResolution: number;
  /** Velocity lost per second (settling toward rest). Higher = calms down faster. */
  velocityDissipation: number;
  /** Dye lost per second (settling/fading toward rest). */
  dyeDissipation: number;
  /** Strength of the ambient curl-noise force — the resting-state motion. */
  ambientStrength: number;
  /** Spatial scale of the ambient curl-noise field. */
  ambientScale: number;
  /**
   * Vorticity confinement strength: how strongly existing rotation in the
   * fluid feeds back into itself each frame, resisting the pressure
   * solve's tendency to numerically smooth curls away. This is what makes
   * a splat's rotation persist and read as a vortex instead of dissolving
   * into a blob within a few frames. Zero disables it entirely.
   */
  curlStrength: number;
  /** Jacobi iterations for the pressure solve. More = more accurate incompressibility. */
  pressureIterations: number;
  /** Gaussian falloff radius (in uv units) for injected splats. */
  splatRadius: number;
}

/**
 * Tuned for restraint, not maximum turbulence — fast, controlled settling
 * and subtle vorticity rather than lingering chaotic motion. (Informed by
 * studying a production fluid config that runs dissipation high and curl
 * low for exactly this reason: a calm resting state that answers a touch
 * and settles back down, instead of staying stirred up.)
 */
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  simResolution: 128,
  dyeResolution: 512,
  velocityDissipation: 0.55,
  dyeDissipation: 0.85,
  ambientStrength: 0.1,
  ambientScale: 4.0,
  curlStrength: 7,
  pressureIterations: 20,
  splatRadius: 0.0035,
};

/** A single injected impulse — the only way the outside world touches the field. */
export interface Impulse {
  x: number; // 0..1
  y: number; // 0..1
  dx: number; // velocity-space delta
  dy: number;
  color: THREE.Vector3; // dye color to inject alongside the velocity
}

/**
 * Simulation owns the entire physics pipeline: ambient force -> injection
 * -> vorticity confinement -> pressure projection -> advection -> dye
 * transport. It knows nothing about the cursor (that's interaction/) or
 * about final display color (that's materials/, coming later) — it
 * exposes only the resulting velocity and dye textures for those layers
 * to read.
 */
export class Simulation {
  private gpgpu: GPGPU;
  private config: SimulationConfig;

  private velocity: VelocityField;
  private dye: DyeField;
  private pressure: { fbo: ReturnType<GPGPU['createDoubleFBO']> };
  private divergenceTarget: THREE.WebGLRenderTarget;
  private curlTarget: THREE.WebGLRenderTarget;

  private simTexelSize: THREE.Vector2;
  private dyeTexelSize: THREE.Vector2;

  private curlForceMaterial: THREE.ShaderMaterial;
  private curlMaterial: THREE.ShaderMaterial;
  private vorticityMaterial: THREE.ShaderMaterial;
  private splatMaterial: THREE.ShaderMaterial;
  private advectMaterial: THREE.ShaderMaterial;
  private divergenceMaterial: THREE.ShaderMaterial;
  private pressureMaterial: THREE.ShaderMaterial;
  private gradientSubtractMaterial: THREE.ShaderMaterial;

  private elapsed = 0;
  private aspect: number;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number, config: Partial<SimulationConfig> = {}) {
    this.gpgpu = new GPGPU(renderer);
    this.config = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    this.aspect = width / height;

    const type = GPGPU.preferredType(renderer);

    const simSize = this.resolutionFor(this.config.simResolution);
    const dyeSize = this.resolutionFor(this.config.dyeResolution);

    this.velocity = new VelocityField(this.gpgpu, simSize.width, simSize.height, type);
    this.dye = new DyeField(this.gpgpu, dyeSize.width, dyeSize.height, type);
    this.pressure = { fbo: this.gpgpu.createDoubleFBO(simSize.width, simSize.height, type) };
    this.divergenceTarget = new THREE.WebGLRenderTarget(simSize.width, simSize.height, {
      type,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.curlTarget = new THREE.WebGLRenderTarget(simSize.width, simSize.height, {
      type,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });

    this.simTexelSize = new THREE.Vector2(1 / simSize.width, 1 / simSize.height);
    this.dyeTexelSize = new THREE.Vector2(1 / dyeSize.width, 1 / dyeSize.height);

    this.curlForceMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: curlForceFrag,
      uniforms: {
        uVelocity: { value: null },
        uTime: { value: 0 },
        uStrength: { value: this.config.ambientStrength },
        uScale: { value: this.config.ambientScale },
        uDeltaTime: { value: 0 },
      },
    });

    this.curlMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: curlFrag,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: this.simTexelSize },
      },
    });

    this.vorticityMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: vorticityConfinementFrag,
      uniforms: {
        uVelocity: { value: null },
        uCurl: { value: null },
        uTexelSize: { value: this.simTexelSize },
        uCurlStrength: { value: this.config.curlStrength },
        uDeltaTime: { value: 0 },
      },
    });

    this.splatMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: splatFrag,
      uniforms: {
        uTarget: { value: null },
        uPoint: { value: new THREE.Vector2() },
        uValue: { value: new THREE.Vector3() },
        uRadius: { value: this.config.splatRadius },
        uAspect: { value: this.aspect },
      },
    });

    this.advectMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: advectFrag,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        uTexelSize: { value: new THREE.Vector2() },
        uDeltaTime: { value: 0 },
        uDissipation: { value: 0 },
      },
    });

    this.divergenceMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: divergenceFrag,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: this.simTexelSize },
      },
    });

    this.pressureMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: pressureFrag,
      uniforms: {
        uPressure: { value: null },
        uDivergence: { value: null },
        uTexelSize: { value: this.simTexelSize },
      },
    });

    this.gradientSubtractMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: gradientSubtractFrag,
      uniforms: {
        uPressure: { value: null },
        uVelocity: { value: null },
        uTexelSize: { value: this.simTexelSize },
      },
    });
  }

  private resolutionFor(longerAxis: number): { width: number; height: number } {
    if (this.aspect >= 1) {
      return { width: Math.round(longerAxis), height: Math.round(longerAxis / this.aspect) };
    }
    return { width: Math.round(longerAxis * this.aspect), height: Math.round(longerAxis) };
  }

  get velocityTexture(): THREE.Texture {
    return this.velocity.texture;
  }

  get dyeTexture(): THREE.Texture {
    return this.dye.texture;
  }

  /** Exposed so display-layer shaders can do their own neighbor sampling (e.g. pseudo-surface shading) without duplicating resolution math. */
  get dyeTexelSizeVec(): THREE.Vector2 {
    return this.dyeTexelSize;
  }

  /** Injects a single impulse: velocity change + dye, both via the splat pass. */
  splat(impulse: Impulse): void {
    const forceScale = 1200; // maps normalized pointer delta into velocity-field units

    this.splatMaterial.uniforms.uTarget.value = this.velocity.texture;
    this.splatMaterial.uniforms.uPoint.value.set(impulse.x, impulse.y);
    this.splatMaterial.uniforms.uValue.value.set(impulse.dx * forceScale, impulse.dy * forceScale, 0);
    this.splatMaterial.uniforms.uRadius.value = this.config.splatRadius;
    this.gpgpu.pass(this.splatMaterial, this.velocity.fbo.write);
    this.velocity.swap();

    this.splatMaterial.uniforms.uTarget.value = this.dye.texture;
    this.splatMaterial.uniforms.uValue.value.copy(impulse.color);
    this.gpgpu.pass(this.splatMaterial, this.dye.fbo.write);
    this.dye.swap();
  }

  /**
   * Advances the simulation by one frame. External injection (cursor-driven
   * splats) is expected to have already been applied via `splat()` — by
   * ForceInjector — before this is called; this method handles everything
   * that happens regardless of user input.
   *
   * Pipeline order matches Stam/Fedkiw stable fluids: vorticity confinement
   * and pressure projection both operate on the field as it stands after
   * this frame's forces are added, and velocity only self-advects *after*
   * it's been made divergence-free — advecting first and projecting after
   * (the previous order here) lets slightly-compressible velocity get
   * carried around before it's cleaned up, which softens vortex shapes.
   */
  step(deltaTime: number): void {
    const dt = Math.min(deltaTime, 1 / 30); // clamp to keep the solver stable on frame hitches
    this.elapsed += dt;

    // 1. Ambient curl-noise force — the persistent, autonomous resting motion.
    this.curlForceMaterial.uniforms.uVelocity.value = this.velocity.texture;
    this.curlForceMaterial.uniforms.uTime.value = this.elapsed;
    this.curlForceMaterial.uniforms.uDeltaTime.value = dt;
    this.gpgpu.pass(this.curlForceMaterial, this.velocity.fbo.write);
    this.velocity.swap();

    // 2. Measure the field's own rotation...
    this.curlMaterial.uniforms.uVelocity.value = this.velocity.texture;
    this.gpgpu.pass(this.curlMaterial, this.curlTarget);

    // ...and feed energy back into it, so existing vortices resist the
    // pressure solve's tendency to smooth them away (step 4).
    this.vorticityMaterial.uniforms.uVelocity.value = this.velocity.texture;
    this.vorticityMaterial.uniforms.uCurl.value = this.curlTarget.texture;
    this.vorticityMaterial.uniforms.uDeltaTime.value = dt;
    this.gpgpu.pass(this.vorticityMaterial, this.velocity.fbo.write);
    this.velocity.swap();

    // 3. Pressure projection — enforce incompressibility so the field
    //    swirls and conserves momentum instead of just diffusing.
    this.divergenceMaterial.uniforms.uVelocity.value = this.velocity.texture;
    this.gpgpu.pass(this.divergenceMaterial, this.divergenceTarget);

    // Clear pressure toward zero each frame for solver stability, then
    // relax it toward the true solution via Jacobi iteration.
    this.pressureMaterial.uniforms.uDivergence.value = this.divergenceTarget.texture;
    for (let i = 0; i < this.config.pressureIterations; i++) {
      this.pressureMaterial.uniforms.uPressure.value = this.pressure.fbo.texture;
      this.gpgpu.pass(this.pressureMaterial, this.pressure.fbo.write);
      this.pressure.fbo.swap();
    }

    this.gradientSubtractMaterial.uniforms.uPressure.value = this.pressure.fbo.texture;
    this.gradientSubtractMaterial.uniforms.uVelocity.value = this.velocity.texture;
    this.gpgpu.pass(this.gradientSubtractMaterial, this.velocity.fbo.write);
    this.velocity.swap();

    // 4. Self-advect velocity (propagation) with dissipation (settling),
    //    now that it's divergence-free.
    this.advectMaterial.uniforms.uVelocity.value = this.velocity.texture;
    this.advectMaterial.uniforms.uSource.value = this.velocity.texture;
    this.advectMaterial.uniforms.uTexelSize.value = this.simTexelSize;
    this.advectMaterial.uniforms.uDeltaTime.value = dt;
    this.advectMaterial.uniforms.uDissipation.value = this.config.velocityDissipation;
    this.gpgpu.pass(this.advectMaterial, this.velocity.fbo.write);
    this.velocity.swap();

    // 5. Advect dye through the final velocity field.
    this.advectMaterial.uniforms.uVelocity.value = this.velocity.texture;
    this.advectMaterial.uniforms.uSource.value = this.dye.texture;
    this.advectMaterial.uniforms.uTexelSize.value = this.dyeTexelSize;
    this.advectMaterial.uniforms.uDeltaTime.value = dt;
    this.advectMaterial.uniforms.uDissipation.value = this.config.dyeDissipation;
    this.gpgpu.pass(this.advectMaterial, this.dye.fbo.write);
    this.dye.swap();
  }

  resize(width: number, height: number): void {
    // Simulation runs at a fixed internal resolution independent of the
    // canvas' pixel size, so resize only needs to track aspect ratio for
    // splat positioning correctness — not reallocate buffers on every drag.
    this.aspect = width / height;
    this.splatMaterial.uniforms.uAspect.value = this.aspect;
  }

  dispose(): void {
    this.velocity.dispose();
    this.dye.dispose();
    this.pressure.fbo.dispose();
    this.divergenceTarget.dispose();
    this.curlTarget.dispose();
    this.gpgpu.dispose();
  }
}
