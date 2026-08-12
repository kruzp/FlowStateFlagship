import * as THREE from 'three';
import { GPGPU } from './GPGPU';
import { VelocityField } from './fields/VelocityField';
import { DyeField } from './fields/DyeField';

import fullscreenVert from './shaders/fullscreen.vert.glsl?raw';
import curlForceFrag from './shaders/curlForce.frag.glsl?raw';
import splatFrag from './shaders/splat.frag.glsl?raw';
import advectFrag from './shaders/advect.frag.glsl?raw';
import divergenceFrag from './shaders/divergence.frag.glsl?raw';
import pressureFrag from './shaders/pressure.frag.glsl?raw';
import gradientSubtractFrag from './shaders/gradientSubtract.frag.glsl?raw';
import vorticityFrag from './shaders/vorticity.frag.glsl?raw';
import confinementFrag from './shaders/confinement.frag.glsl?raw';

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

  /** Jacobi iterations for the pressure solve. */
  pressureIterations: number;

  /** Gaussian falloff radius (in uv units) for injected splats. */
  splatRadius: number;
  /** Vorticity confinement strength — how strongly existing swirl is reinforced. */
  curlStrength: number;

}
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  simResolution: 128,
  dyeResolution: 512,

  // Keep the trail smooth and allow it to settle naturally.
  velocityDissipation: 0.2,
  dyeDissipation: 0.6,

  // Very low autonomous motion.
  // This prevents the resting field from constantly generating swirls.
  ambientStrength: 0.02,
  ambientScale: 3.0,

  pressureIterations: 20,

  // Keep the input localized.
  splatRadius: 0.003,

  // Much weaker confinement.
  // Large structures can still curl, but small vortices are not
  // aggressively amplified.
  curlStrength: 4,
};

/** A single injected impulse — the only way the outside world touches the field. */
export interface Impulse {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: THREE.Vector3;
}

export class Simulation {
  private gpgpu: GPGPU;
  private config: SimulationConfig;

  private velocity: VelocityField;
  private dye: DyeField;
  private pressure: {
    fbo: ReturnType<GPGPU['createDoubleFBO']>;
  };

  private divergenceTarget: THREE.WebGLRenderTarget;
  private vorticityTarget: THREE.WebGLRenderTarget;

  private simTexelSize: THREE.Vector2;
  private dyeTexelSize: THREE.Vector2;

  private curlForceMaterial: THREE.ShaderMaterial;
  private splatMaterial: THREE.ShaderMaterial;
  private advectMaterial: THREE.ShaderMaterial;
  private divergenceMaterial: THREE.ShaderMaterial;
  private pressureMaterial: THREE.ShaderMaterial;
  private gradientSubtractMaterial: THREE.ShaderMaterial;
  private vorticityMaterial: THREE.ShaderMaterial;
  private confinementMaterial: THREE.ShaderMaterial;

  private elapsed = 0;
  private aspect: number;

  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    config: Partial<SimulationConfig> = {},
  ) {
    this.gpgpu = new GPGPU(renderer);
    this.config = {
      ...DEFAULT_SIMULATION_CONFIG,
      ...config,
    };

    this.aspect = width / height;

    const type = GPGPU.preferredType(renderer);

    const simSize = this.resolutionFor(this.config.simResolution);
    const dyeSize = this.resolutionFor(this.config.dyeResolution);

    this.velocity = new VelocityField(
      this.gpgpu,
      simSize.width,
      simSize.height,
      type,
    );

    this.dye = new DyeField(
      this.gpgpu,
      dyeSize.width,
      dyeSize.height,
      type,
    );

    this.pressure = {
      fbo: this.gpgpu.createDoubleFBO(
        simSize.width,
        simSize.height,
        type,
      ),
    };

    this.divergenceTarget = new THREE.WebGLRenderTarget(
      simSize.width,
      simSize.height,
      {
        type,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        stencilBuffer: false,
      },
    );

    this.vorticityTarget = new THREE.WebGLRenderTarget(
      simSize.width,
      simSize.height,
      {
        type,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        stencilBuffer: false,
      },
    );

    this.simTexelSize = new THREE.Vector2(
      1 / simSize.width,
      1 / simSize.height,
    );

    this.dyeTexelSize = new THREE.Vector2(
      1 / dyeSize.width,
      1 / dyeSize.height,
    );

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

    this.vorticityMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: vorticityFrag,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: this.simTexelSize },
      },
    });

    this.confinementMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: confinementFrag,
      uniforms: {
        uVelocity: { value: null },
        uVorticity: { value: null },
        uTexelSize: { value: this.simTexelSize },
        uCurlStrength: { value: this.config.curlStrength },
        uDeltaTime: { value: 0 },
      },
    });
  }

  private resolutionFor(longerAxis: number): {
    width: number;
    height: number;
  } {
    if (this.aspect >= 1) {
      return {
        width: Math.round(longerAxis),
        height: Math.round(longerAxis / this.aspect),
      };
    }

    return {
      width: Math.round(longerAxis * this.aspect),
      height: Math.round(longerAxis),
    };
  }

  get velocityTexture(): THREE.Texture {
    return this.velocity.texture;
  }

  get dyeTexture(): THREE.Texture {
    return this.dye.texture;
  }

  get vorticityTexture(): THREE.Texture {
    return this.vorticityTarget.texture;
  }

  splat(impulse: Impulse): void {
    /*
     * Keep the injection strong enough to feel responsive,
     * but avoid creating unnecessarily violent velocity gradients.
     */
    const forceScale = 1000;

    // Velocity injection.
    this.splatMaterial.uniforms.uTarget.value =
      this.velocity.texture;

    this.splatMaterial.uniforms.uPoint.value.set(
      impulse.x,
      impulse.y,
    );

    this.splatMaterial.uniforms.uValue.value.set(
      impulse.dx * forceScale,
      impulse.dy * forceScale,
      0,
    );

    this.splatMaterial.uniforms.uRadius.value =
      this.config.splatRadius;

    this.gpgpu.pass(
      this.splatMaterial,
      this.velocity.fbo.write,
    );

    this.velocity.swap();

    // Dye injection.
    this.splatMaterial.uniforms.uTarget.value =
      this.dye.texture;

    this.splatMaterial.uniforms.uValue.value.copy(
      impulse.color,
    );

    this.gpgpu.pass(
      this.splatMaterial,
      this.dye.fbo.write,
    );

    this.dye.swap();
  }

  step(deltaTime: number): void {
    const dt = Math.min(deltaTime, 1 / 30);

    this.elapsed += dt;

    /*
     * 1. Very subtle ambient motion.
     *
     * This gives the material life while the user is not interacting,
     * but is intentionally weak so it does not create a field full
     * of independent vortices.
     */
    this.curlForceMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.curlForceMaterial.uniforms.uTime.value =
      this.elapsed;

    this.curlForceMaterial.uniforms.uDeltaTime.value =
      dt;

    this.gpgpu.pass(
      this.curlForceMaterial,
      this.velocity.fbo.write,
    );

    this.velocity.swap();

    /*
     * 2. Measure and gently reinforce existing vorticity.
     *
     * The confinement shader itself performs the thresholding.
     * Keeping the global strength low prevents the entire trail
     * from becoming a collection of small rotating cells.
     */
    this.vorticityMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.gpgpu.pass(
      this.vorticityMaterial,
      this.vorticityTarget,
    );

    this.confinementMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.confinementMaterial.uniforms.uVorticity.value =
      this.vorticityTarget.texture;

    this.confinementMaterial.uniforms.uDeltaTime.value =
      dt;

    this.gpgpu.pass(
      this.confinementMaterial,
      this.velocity.fbo.write,
    );

    this.velocity.swap();

    /*
     * 3. Pressure projection.
     *
     * Unchanged physics pipeline.
     */
    this.divergenceMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.gpgpu.pass(
      this.divergenceMaterial,
      this.divergenceTarget,
    );

    this.pressureMaterial.uniforms.uDivergence.value =
      this.divergenceTarget.texture;

    for (
      let i = 0;
      i < this.config.pressureIterations;
      i++
    ) {
      this.pressureMaterial.uniforms.uPressure.value =
        this.pressure.fbo.texture;

      this.gpgpu.pass(
        this.pressureMaterial,
        this.pressure.fbo.write,
      );

      this.pressure.fbo.swap();
    }

    this.gradientSubtractMaterial.uniforms.uPressure.value =
      this.pressure.fbo.texture;

    this.gradientSubtractMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.gpgpu.pass(
      this.gradientSubtractMaterial,
      this.velocity.fbo.write,
    );

    this.velocity.swap();

    /*
     * 4. Advect velocity.
     */
    this.advectMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.advectMaterial.uniforms.uSource.value =
      this.velocity.texture;

    this.advectMaterial.uniforms.uTexelSize.value =
      this.simTexelSize;

    this.advectMaterial.uniforms.uDeltaTime.value =
      dt;

    this.advectMaterial.uniforms.uDissipation.value =
      this.config.velocityDissipation;

    this.gpgpu.pass(
      this.advectMaterial,
      this.velocity.fbo.write,
    );

    this.velocity.swap();

    /*
     * 5. Advect dye through the same velocity field.
     */
    this.advectMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.advectMaterial.uniforms.uSource.value =
      this.dye.texture;

    this.advectMaterial.uniforms.uTexelSize.value =
      this.dyeTexelSize;

    this.advectMaterial.uniforms.uDeltaTime.value =
      dt;

    this.advectMaterial.uniforms.uDissipation.value =
      this.config.dyeDissipation;

    this.gpgpu.pass(
      this.advectMaterial,
      this.dye.fbo.write,
    );

    this.dye.swap();
  }

  resize(width: number, height: number): void {
    this.aspect = width / height;

    this.splatMaterial.uniforms.uAspect.value =
      this.aspect;
  }

  dispose(): void {
    this.velocity.dispose();
    this.dye.dispose();
    this.pressure.fbo.dispose();
    this.divergenceTarget.dispose();
    this.vorticityTarget.dispose();
    this.gpgpu.dispose();
  }
}