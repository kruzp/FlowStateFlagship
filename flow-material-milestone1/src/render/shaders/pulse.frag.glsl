precision highp float;

varying vec2 vUv;
uniform float uTime;

// Milestone 1 placeholder only. This confirms the shader pipeline compiles
// and receives per-frame uniforms correctly. It gets replaced by the real
// color-response pass (base color + velocity/vorticity-driven accents)
// once the simulation fields exist — see milestones 2-7.
void main() {
  vec3 base = vec3(0.02, 0.02, 0.025);
  float pulse = 0.05 + 0.05 * sin(uTime * 0.6);
  vec3 color = base + pulse * vec3(0.05, 0.25, 0.2);
  gl_FragColor = vec4(color, 1.0);
}
