precision highp float;

varying vec2 vUv;

uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
uniform float uAspect;

/**
 * Generic additive Gaussian splat. Used for both velocity injection (uValue
 * = force direction * strength, z unused) and dye injection (uValue = color).
 * This is the ONLY way energy enters the system from outside — the cursor
 * never moves the material directly, it only adds to this splat.
 */
void main() {
  vec3 base = texture2D(uTarget, vUv).xyz;

  vec2 diff = vUv - uPoint;
  diff.x *= uAspect;
  float falloff = exp(-dot(diff, diff) / uRadius);

  vec3 result = base + uValue * falloff;
  gl_FragColor = vec4(result, 1.0);
}
