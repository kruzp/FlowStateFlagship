precision highp float;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDeltaTime;
uniform float uDissipation;

/*
 * Semi-Lagrangian advection (Stam, "Stable Fluids"): trace each texel
 * backward along the velocity field to find where its quantity came from,
 * and sample it there. This is how energy PROPAGATES through the field
 * according to its own rules rather than being pushed around directly.
 *
 * uDissipation < 1.0 is the settling mechanism: every step, a small
 * fraction of the quantity (velocity or dye) is lost, so the system
 * gradually relaxes back toward its resting state after a disturbance.
 */
void main() {
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  vec2 sourceCoord = vUv - uDeltaTime * velocity * uTexelSize;

  vec3 result = texture2D(uSource, sourceCoord).xyz;
  float decay = 1.0 + uDissipation * uDeltaTime;

  gl_FragColor = vec4(result / decay, 1.0);
}
