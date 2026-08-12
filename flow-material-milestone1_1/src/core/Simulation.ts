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
  simResolution: number;
  dyeResolution: number;
  velocityDissipation: number;
  dyeDissipation: number;
  ambientStrength: number;
  ambientScale: number;
  pressureIterations: number;
  splatRadius: number;
  curlStrength: number;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  simResolution: 128,
  dyeResolution: 512,

  velocityDissipation: 0.08,
  dyeDissipation: 0.45,

  ambientStrength: 0.0,
  ambientScale: 3.0,

  pressureIterations: 20,

  splatRadius: 0.003,

  curlStrength: 4.0,
};

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

    const simSize = this.resolutionFor(
      this.config.simResolution,
    );

    const dyeSize = this.resolutionFor(
      this.config.dyeResolution,
    );

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

    this.divergenceTarget =
      new THREE.WebGLRenderTarget(
        simSize.width,
        simSize.height,
        {
          type,
          format: THREE.RGBAFormat,
          depthBuffer: false,
          stencilBuffer: false,
        },
      );

    this.vorticityTarget =
      new THREE.WebGLRenderTarget(
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

    // Ambient force
    this.curlForceMaterial =
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: curlForceFrag,
        uniforms: {
          uVelocity: { value: null },
          uTime: { value: 0 },
          uStrength: {
            value: this.config.ambientStrength,
          },
          uScale: {
            value: this.config.ambientScale,
          },
          uDeltaTime: { value: 0 },
        },
      });

    // Splat / cursor injection
    this.splatMaterial =
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: splatFrag,
        uniforms: {
          uTarget: { value: null },
          uPoint: {
            value: new THREE.Vector2(),
          },
          uValue: {
            value: new THREE.Vector3(),
          },
          uRadius: {
            value: this.config.splatRadius,
          },
          uAspect: {
            value: this.aspect,
          },
        },
      });

    // Advection
    this.advectMaterial =
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: advectFrag,
        uniforms: {
          uVelocity: { value: null },
          uSource: { value: null },
          uTexelSize: {
            value: new THREE.Vector2(),
          },
          uDeltaTime: { value: 0 },
          uDissipation: { value: 0 },
        },
      });

    // Divergence
    this.divergenceMaterial =
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: divergenceFrag,
        uniforms: {
          uVelocity: { value: null },
          uTexelSize: {
            value: this.simTexelSize,
          },
        },
      });

    // Pressure solve
    this.pressureMaterial =
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: pressureFrag,
        uniforms: {
          uPressure: { value: null },
          uDivergence: { value: null },
          uTexelSize: {
            value: this.simTexelSize,
          },
        },
      });

    // Pressure gradient subtraction
    this.gradientSubtractMaterial =
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: gradientSubtractFrag,
        uniforms: {
          uPressure: { value: null },
          uVelocity: { value: null },
          uTexelSize: {
            value: this.simTexelSize,
          },
        },
      });

    // Vorticity
    this.vorticityMaterial =
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: vorticityFrag,
        uniforms: {
          uVelocity: { value: null },
          uTexelSize: {
            value: this.simTexelSize,
          },
        },
      });

    // Vorticity confinement
    this.confinementMaterial =
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: confinementFrag,
        uniforms: {
          uVelocity: { value: null },
          uVorticity: { value: null },
          uTexelSize: {
            value: this.simTexelSize,
          },
          uCurlStrength: {
            value: this.config.curlStrength,
          },
          uDeltaTime: { value: 0 },
        },
      });
  }

  private resolutionFor(
    longerAxis: number,
  ): {
    width: number;
    height: number;
  } {
    if (this.aspect >= 1) {
      return {
        width: Math.round(longerAxis),
        height: Math.round(
          longerAxis / this.aspect,
        ),
      };
    }

    return {
      width: Math.round(
        longerAxis * this.aspect,
      ),
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
    const forceScale = 700;

    // Inject velocity
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

    // Inject dye
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
    const dt = Math.min(
      deltaTime,
      1 / 30,
    );

    this.elapsed += dt;

    // 1. Ambient motion
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

    // 2. Measure vorticity
    this.vorticityMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.gpgpu.pass(
      this.vorticityMaterial,
      this.vorticityTarget,
    );

    // 3. Apply gentle vorticity confinement
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

    // 4. Calculate divergence
    this.divergenceMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.gpgpu.pass(
      this.divergenceMaterial,
      this.divergenceTarget,
    );

    // 5. Solve pressure
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

    // 6. Subtract pressure gradient
    this.gradientSubtractMaterial.uniforms.uPressure.value =
      this.pressure.fbo.texture;

    this.gradientSubtractMaterial.uniforms.uVelocity.value =
      this.velocity.texture;

    this.gpgpu.pass(
      this.gradientSubtractMaterial,
      this.velocity.fbo.write,
    );

    this.velocity.swap();

    // 7. Advect velocity
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

    // 8. Advect dye
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

  resize(
    width: number,
    height: number,
  ): void {
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