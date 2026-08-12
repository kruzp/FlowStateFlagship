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
        1.15
    );

    // Existing restrained green → teal material.
    vec3 glow =
        dyeAmount * vec3(0.015, 0.16, 0.38) * diffuse;

    // Existing subtle velocity tint.
    vec3 tint =
        speed * vec3(0.008, 0.035, 0.10);

    // Very subtle wet/glass-like highlight.
    // This only affects the visible material.
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    vec3 halfDir = normalize(lightDir + viewDir);

    float specular = pow(
        max(dot(normal, halfDir), 0.0),
        32.0
    );

    specular *= dyeAmount * 0.18;

    vec3 highlight =
        vec3(0.25, 0.9, 0.8) * specular;

    vec3 color =
        glow +
        tint +
        highlight;

    // Keep the material transparent when resting.
    float alpha = clamp(
        dyeAmount * 0.75 +
        speed * 0.12,
        0.0,
        0.9
    );

    // Premultiplied-alpha output.
    gl_FragColor = vec4(
        color * alpha,
        alpha
    );
}