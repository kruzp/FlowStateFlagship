precision highp float;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexelSize;
uniform float uCurlStrength;
uniform float uDeltaTime;

/**
 * Vorticity confinement (Fedkiw et al.). Without this, the pressure
 * projection's Jacobi solve numerically diffuses rotational detail every
 * frame — a splat can start a vortex, but it gets smoothed flat within a
 * handful of frames regardless of how the fluid "wants" to move. This
 * pass counteracts exactly that: it builds the gradient of |curl| with
 * its x/y components already swapped (T-B, R-L) and flips the sign of
 * the resulting y, which is algebraically the 2D cross product of that
 * gradient with the curl itself — the force that always points from
 * weaker rotation toward stronger rotation, tightening existing swirls
 * rather than inventing new motion. It has nothing to push with where
 * the field isn't already rotating.
 */
void main() {
  float left = texture2D(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
  float right = texture2D(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
  float bottom = texture2D(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
  float top = texture2D(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
  float center = texture2D(uCurl, vUv).x;

  vec2 gradient = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));
  gradient /= length(gradient) + 0.0001;

  vec2 force = uCurlStrength * center * gradient;
  force.y *= -1.0;

  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * uDeltaTime;

  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
