import * as THREE from 'three';
import { Renderer } from '../render/Renderer';
import vertexShader from '../render/shaders/fullscreen.vert.glsl?raw';
import fragmentShader from '../render/shaders/pulse.frag.glsl?raw';

/**
 * App is the milestone-1 harness: it wires up the renderer, a placeholder
 * fullscreen shader quad (to verify the shader pipeline compiles and runs
 * end to end), the animation loop, and resize handling. No simulation logic
 * lives here — this file's quad/material get replaced by real Simulation +
 * MaterialDefinition wiring in later milestones, not extended in place.
 */
export class App {
  private renderer: Renderer;
  private clock: THREE.Clock;
  private material: THREE.ShaderMaterial;
  private frameId: number | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);

    if (!this.renderer.isReady) {
      this.showFallback(container);
      throw new Error('WebGL2 not supported — halting App initialization.');
    }

    this.clock = new THREE.Clock();

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.renderer.add(quad);

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  private showFallback(container: HTMLElement): void {
    container.style.display = 'none';
    const fallback = document.getElementById('fallback');
    if (fallback) fallback.style.display = 'flex';
  }

  private handleResize = (): void => {
    this.renderer.resize(window.innerWidth, window.innerHeight);
  };

  start(): void {
    const loop = (): void => {
      this.material.uniforms.uTime.value = this.clock.getElapsedTime();
      this.renderer.render();
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
