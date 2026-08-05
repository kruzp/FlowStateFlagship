precision highp float;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

/**
 * Computes 2D vorticity (scalar curl) at each texel: dv/dx - du/dy. This is
 * a measurement pass only — it does not alter velocity. Simulation.ts feeds
 * this output into confinement.frag.glsl (to reinforce swirl) and also
 * exposes it to the materials/ layer, where vorticity magnitude drives the
 * blue color accent.
 */
void main() {
  float left = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
  float right = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
  float bottom = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
  float top = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;

  float curl = 0.5 * ((right - left) - (top - bottom));

  gl_FragColor = vec4(curl, 0.0, 0.0, 1.0);
}
