precision highp float;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform float uTime;
uniform float uStrength;
uniform float uScale;
uniform float uDeltaTime;

// Value-noise based analytic curl field. This is the sole source of the
// material's "resting state" motion — it runs every frame, with or without
// user interaction, so the material is never truly still. It is deliberately
// gentle: this is ambient turbulence, not user-driven force.

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Curl of a scalar potential field approximated via finite differences.
// Guarantees a divergence-free-ish force, which keeps the ambient motion
// swirling rather than pooling or expanding uniformly.
vec2 curl(vec2 p) {
  float e = 0.08;
  float n1 = valueNoise(p + vec2(0.0, e));
  float n2 = valueNoise(p - vec2(0.0, e));
  float n3 = valueNoise(p + vec2(e, 0.0));
  float n4 = valueNoise(p - vec2(e, 0.0));
  float dx = (n1 - n2) / (2.0 * e);
  float dy = (n3 - n4) / (2.0 * e);
  return vec2(dx, -dy);
}

void main() {
  vec3 velocity = texture2D(uVelocity, vUv).xyz;

  // Oscillate the sample point rather than translating it continuously.
  // A steady one-directional slide through the noise field can pick up
  // that field's local statistical bias and compound it every frame into
  // a runaway "wind" in one direction — oscillating keeps revisiting the
  // same neighborhood, so any local bias shows up as extra swirl rather
  // than a net drift.
  vec2 windOffset = vec2(sin(uTime * 0.12), cos(uTime * 0.09)) * 1.4;
  vec2 samplePoint = vUv * uScale + windOffset;
  vec2 force = curl(samplePoint) * uStrength;

  velocity.xy += force * uDeltaTime;

  gl_FragColor = vec4(velocity, 1.0);
}
