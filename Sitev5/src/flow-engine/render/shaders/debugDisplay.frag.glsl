precision highp float;

varying vec2 vUv;

uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

/**
 * Placeholder display shader pending the real color-identity material
 * (milestone 7) — but tuned for restraint, not raw debug output. Dye
 * magnitude drives a dim green→teal glow; velocity adds a faint blue
 * tint. A cheap pseudo-surface normal, built from the dye field's own
 * gradient (the same trick most GPU fluid demos use for "shading"),
 * catches a fixed light direction so the material reads as a lit
 * surface with depth instead of a flat color wash. Alpha rises with
 * dye presence so the resting state stays mostly transparent — the
 * material composites into whatever contains it rather than painting
 * an opaque box over it.
 */
void main() {
  vec3 dye = texture2D(uDye, vUv).rgb;
  vec2 velocity = texture2D(uVelocity, vUv).xy;

  float dyeAmount = clamp(length(dye), 0.0, 1.5);
  float speed = clamp(length(velocity) * 0.01, 0.0, 1.0);

  // Pseudo-surface shading: treat dye magnitude as a height field,
  // approximate its gradient from neighboring texels, and light it like
  // a bump map. Display-only — reads nothing back into the simulation.
  float l = length(texture2D(uDye, vUv - vec2(uTexelSize.x, 0.0)).rgb);
  float r = length(texture2D(uDye, vUv + vec2(uTexelSize.x, 0.0)).rgb);
  float b = length(texture2D(uDye, vUv - vec2(0.0, uTexelSize.y)).rgb);
  float t = length(texture2D(uDye, vUv + vec2(0.0, uTexelSize.y)).rgb);

  vec3 normal = normalize(vec3(l - r, b - t, 0.6));
  vec3 lightDir = normalize(vec3(0.25, 0.5, 0.85));
  float diffuse = clamp(dot(normal, lightDir) * 0.5 + 0.75, 0.6, 1.15);

  vec3 base = vec3(0.015, 0.017, 0.02);
  vec3 glow = dyeAmount * vec3(0.04, 0.5, 0.4) * diffuse;
  vec3 tint = speed * vec3(0.0, 0.05, 0.16);

  vec3 color = base + glow + tint;
  float alpha = clamp(0.55 + dyeAmount * 0.4 + speed * 0.15, 0.0, 1.0);

  // premultipliedAlpha-correct output for the transparent WebGL context.
  gl_FragColor = vec4(color * alpha, alpha);
}
