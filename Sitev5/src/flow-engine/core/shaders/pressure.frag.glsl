precision highp float;

varying vec2 vUv;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;

/**
 * One Jacobi relaxation iteration solving the discrete Poisson equation
 * for pressure. Simulation.ts runs this many times per frame against the
 * same divergence field, converging pressure toward a solution that,
 * once subtracted from velocity (gradientSubtract), makes the field
 * divergence-free — i.e. incompressible.
 */
void main() {
  float left = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float right = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float bottom = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float top = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float divergence = texture2D(uDivergence, vUv).x;

  float pressure = (left + right + bottom + top - divergence) * 0.25;

  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
