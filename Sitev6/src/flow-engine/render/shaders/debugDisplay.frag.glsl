precision highp float;

varying vec2 vUv;

uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
/*
 * Display-only material shader.
 * Does not modify or feed back into the simulation.
 */
void main() {
    vec3 dye = texture2D(uDye, vUv).rgb;
    vec2 velocity = texture2D(uVelocity, vUv).xy;

    float dyeAmount = clamp(length(dye), 0.0, 1.5);
    float speed = clamp(length(velocity) * 0.01, 0.0, 1.0);

    // Approximate a surface normal from the dye field.
    float l = length(texture2D(
        uDye,
        vUv - vec2(uTexelSize.x, 0.0)
    ).rgb);

    float r = length(texture2D(
        uDye,
        vUv + vec2(uTexelSize.x, 0.0)
    ).rgb);

    float b = length(texture2D(
        uDye,
        vUv - vec2(0.0, uTexelSize.y)
    ).rgb);

    float t = length(texture2D(
        uDye,
        vUv + vec2(0.0, uTexelSize.y)
    ).rgb);

    vec3 normal = normalize(vec3(l - r, b - t, 0.6));

    vec3 lightDir = normalize(vec3(0.25, 0.5, 0.85));

    float diffuse = clamp(
        dot(normal, lightDir) * 0.5 + 0.75,
        0.6,
        1.0
    );

    vec3 baseColor = vec3(0.035, 0.18, 0.58);
    vec3 shaded = baseColor * dyeAmount * (0.55 + 0.45 * diffuse);

    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
    vec3 rimColor = vec3(0.75, 0.92, 1.0) * rim * 0.08 * dyeAmount;

    vec3 color = shaded + rimColor;

    // Keep the material transparent when resting.
    float alpha = clamp(
        dyeAmount * 0.72 +
        speed * 0.08,
        0.0,
        0.85
    );

    // Premultiplied-alpha output.
    gl_FragColor = vec4(
        color * alpha,
        alpha
    );
}