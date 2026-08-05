precision highp float;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform sampler2D uVorticity;
uniform vec2 uTexelSize;
uniform float uCurlStrength;
uniform float uDeltaTime;

/**
 * Vorticity confinement (Fedkiw et al.): finds the direction in which
 * vorticity magnitude increases fastest, and pushes velocity along the
 * perpendicular of that gradient, scaled by the local vorticity itself.
 * This is what keeps small rotational structures alive instead of letting
 * numerical diffusion smooth them out — it's the difference between a
 * cursor-drag looking like a smeared line versus an ink plume that curls
 * into a mushroom-cap at its leading edge. It does not invent rotation
 * that isn't already present in the field; it amplifies what's there.
 */
void main() {
  float left = abs(texture2D(uVorticity, vUv - vec2(uTexelSize.x, 0.0)).x);
  float right = abs(texture2D(uVorticity, vUv + vec2(uTexelSize.x, 0.0)).x);
  float bottom = abs(texture2D(uVorticity, vUv - vec2(0.0, uTexelSize.y)).x);
  float top = abs(texture2D(uVorticity, vUv + vec2(0.0, uTexelSize.y)).x);
  float center = texture2D(uVorticity, vUv).x;

  vec2 gradient = 0.5 * vec2(right - left, top - bottom);
  float gradientLength = max(length(gradient), 1e-5);
  vec2 direction = gradient / gradientLength;

  vec2 force = uCurlStrength * center * vec2(direction.y, -direction.x);

  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * uDeltaTime;

  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
