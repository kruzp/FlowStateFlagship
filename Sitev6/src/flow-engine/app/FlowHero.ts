import * as THREE from 'three';
import { Renderer } from '../render/Renderer';
import { Simulation } from '../core/Simulation';
import type { SimulationConfig } from '../core/Simulation';
import { InputController } from '../interaction/InputController';
import { ForceInjector } from '../interaction/ForceInjector';
import vertexShader from '../render/shaders/fullscreen.vert.glsl?raw';
import debugDisplayShader from '../render/shaders/debugDisplay.frag.glsl?raw';

/*
 * FlowHero wires the Flow Material engine into a bounded page container.
 *
 * It is an orchestration adapter only. It does not modify the engine's
 * core simulation, interaction, renderer, or display shader internals.
 *
 * Production concerns handled here:
 * - sizes/observes a container instead of the window
 * - pauses rendering when the tab is hidden
 * - respects prefers-reduced-motion
 * - lowers simulation resolution on smaller viewports
 */
export class FlowHero {
  private renderer: Renderer;
  private clock: THREE.Clock;
  private simulation: Simulation;
  private inputController: InputController;
  private forceInjector: ForceInjector;
  private displayMaterial: THREE.ShaderMaterial;
  private frameId: number | null = null;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;

  private visibilityHandler = (): void => {
    if (document.hidden) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  };

  readonly isReady: boolean;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new Renderer(container);
    this.isReady = this.renderer.isReady;

    if (!this.isReady) {
      this.clock = new THREE.Clock();
      this.simulation = null as unknown as Simulation;
      this.inputController = null as unknown as InputController;
      this.forceInjector = null as unknown as ForceInjector;
      this.displayMaterial =
        null as unknown as THREE.ShaderMaterial;
      this.resizeObserver = new ResizeObserver(() => {});
      return;
    }

    this.clock = new THREE.Clock();

    const webgl = this.renderer.webgl!;

    const { width, height } =
      this.container.getBoundingClientRect();

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const lowPower = Math.min(width, height) < 560;

    const configOverrides: Partial<SimulationConfig> = {
      simResolution: lowPower ? 96 : 128,
      dyeResolution: lowPower ? 360 : 512,
      ambientStrength: reducedMotion ? 0.03 : 0.1,
    };

    this.simulation = new Simulation(
      webgl,
      Math.max(width, 1),
      Math.max(height, 1),
      configOverrides,
    );

    this.inputController = new InputController(
      this.renderer.canvas,
    );

    this.forceInjector = new ForceInjector(
      this.simulation,
    );

    this.displayMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: debugDisplayShader,
      uniforms: {
        uDye: {
          value: this.simulation.dyeTexture,
        },
        uVelocity: {
          value: this.simulation.velocityTexture,
        },
      },
      transparent: true,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.displayMaterial,
    );

    this.renderer.add(quad);

    this.resizeObserver = new ResizeObserver(() =>
      this.handleResize(),
    );

    this.resizeObserver.observe(this.container);

    document.addEventListener(
      'visibilitychange',
      this.visibilityHandler,
    );

    this.handleResize();
  }

  private handleResize = (): void => {
    const { width, height } =
      this.container.getBoundingClientRect();

    if (width === 0 || height === 0) {
      return;
    }

    this.renderer.resize(width, height);
    this.simulation.resize(width, height);
  };

  private startLoop(): void {
    if (
      this.frameId !== null ||
      !this.isReady
    ) {
      return;
    }

    this.clock.getDelta();

    const loop = (): void => {
      const dt = this.clock.getDelta();

      const samples =
        this.inputController.consume();

      this.forceInjector.inject(samples);

      this.simulation.step(dt);

      this.displayMaterial.uniforms.uDye.value =
        this.simulation.dyeTexture;

      this.displayMaterial.uniforms.uVelocity.value =
        this.simulation.velocityTexture;

      this.renderer.render();

      this.frameId =
        requestAnimationFrame(loop);
    };

    this.frameId =
      requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  start(): void {
    if (!this.isReady) {
      return;
    }

    this.startLoop();
  }

  dispose(): void {
    this.stopLoop();

    this.resizeObserver.disconnect();

    document.removeEventListener(
      'visibilitychange',
      this.visibilityHandler,
    );

    if (!this.isReady) {
      return;
    }

    this.inputController.dispose();
    this.simulation.dispose();
    this.renderer.dispose();
  }
}