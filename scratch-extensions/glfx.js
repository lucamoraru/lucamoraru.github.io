class ShaderEffectsExtension {
    constructor(runtime) {
        this.runtime = runtime;
        this.gl = runtime.renderer._gl;
        this.program = this._createProgram();
        this.uniforms = this._getUniforms();
    }

    _createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        return shader;
    }

    _createProgram() {
        const vs = this._createShader(this.gl.VERTEX_SHADER, `
            attribute vec2 a_position;
            attribute vec2 a_texcoord;
            varying vec2 v_texcoord;
            void main() {
                v_texcoord = a_texcoord;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `);

        const fs = this._createShader(this.gl.FRAGMENT_SHADER, `
            precision mediump float;

            varying vec2 v_texcoord;
            uniform sampler2D u_texture;

            uniform float hue;
            uniform float invertVal;
            uniform float saturation;
            uniform float contrast;

            uniform float gaussianBlur;
            uniform float boxBlur;
            uniform float sharpen;
            uniform float unsharp;

            uniform float dotScreen;
            uniform float hexPixel;
            uniform float pixelate;
            uniform float halftone;

            uniform float swirl;
            uniform float wave;
            uniform float rotate3d;
            uniform float tile;

            vec3 applyHue(vec3 color, float angle) {
                float s = sin(angle);
                float c = cos(angle);
                mat3 m = mat3(
                    0.299 + 0.701*c + 0.168*s, 0.587 - 0.587*c + 0.330*s, 0.114 - 0.114*c - 0.497*s,
                    0.299 - 0.299*c - 0.328*s, 0.587 + 0.413*c + 0.035*s, 0.114 - 0.114*c + 0.292*s,
                    0.299 - 0.300*c + 1.250*s, 0.587 - 0.588*c - 1.050*s, 0.114 + 0.886*c - 0.203*s
                );
                return clamp(m * color, 0.0, 1.0);
            }

            vec3 applySaturation(vec3 color, float sat) {
                float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
                return mix(vec3(l), color, sat);
            }

            vec3 applyContrast(vec3 color, float c) {
                return (color - 0.5) * c + 0.5;
            }

            vec2 warp(vec2 uv) {
                float s = swirl * 3.1415;
                vec2 center = vec2(0.5);
                vec2 tc = uv - center;
                float r = length(tc);
                float a = atan(tc.y, tc.x) + s * r;
                uv = center + vec2(cos(a), sin(a)) * r;

                uv.y += sin(uv.x * 10.0) * wave * 0.05;

                float t = tile * 10.0;
                uv = fract(uv * (1.0 + t));

                return uv;
            }

            vec3 blur(vec2 uv) {
                vec2 off = vec2(1.0/512.0);
                vec3 col = texture2D(u_texture, uv).rgb;

                vec3 g = vec3(0.0);
                g += texture2D(u_texture, uv + off * vec2(-1,-1)).rgb;
                g += texture2D(u_texture, uv + off * vec2(1,-1)).rgb;
                g += texture2D(u_texture, uv + off * vec2(-1,1)).rgb;
                g += texture2D(u_texture, uv + off * vec2(1,1)).rgb;
                g *= 0.25;

                col = mix(col, g, gaussianBlur);

                vec3 b = vec3(0.0);
                b += texture2D(u_texture, uv + off * vec2(-1,0)).rgb;
                b += texture2D(u_texture, uv + off * vec2(1,0)).rgb;
                b += texture2D(u_texture, uv + off * vec2(0,-1)).rgb;
                b += texture2D(u_texture, uv + off * vec2(0,1)).rgb;
                b *= 0.25;

                col = mix(col, b, boxBlur);

                vec3 sharp = col * 5.0 - (
                    texture2D(u_texture, uv + off * vec2(1,0)).rgb +
                    texture2D(u_texture, uv + off * vec2(-1,0)).rgb +
                    texture2D(u_texture, uv + off * vec2(0,1)).rgb +
                    texture2D(u_texture, uv + off * vec2(0,-1)).rgb
                );

                col = mix(col, sharp, sharpen);

                col = mix(col, col + (col - g), unsharp);

                return col;
            }

            vec3 funEffects(vec2 uv, vec3 col) {
                float d = dotScreen * 50.0;
                float pattern = sin(uv.x*d) * sin(uv.y*d);
                col *= pattern;

                float p = pixelate * 100.0;
                uv = floor(uv * p) / p;
                col = texture2D(u_texture, uv).rgb;

                float h = hexPixel * 50.0;
                uv = floor(uv * h) / h;

                float c = halftone * 20.0;
                col *= sin(uv.x*c) * sin(uv.y*c);

                return col;
            }

            void main() {
                vec2 uv = warp(v_texcoord);
                vec3 col = blur(uv);

                col = applyHue(col, hue * 3.1415);
                col = mix(col, vec3(1.0) - col, invertVal);
                col = applySaturation(col, 1.0 + saturation);
                col = applyContrast(col, 1.0 + contrast);

                col = funEffects(uv, col);

                gl_FragColor = vec4(col, 1.0);
            }
        `);

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);
        return program;
    }

    _getUniforms() {
        const gl = this.gl;
        return {
            hue: gl.getUniformLocation(this.program, "hue"),
            invertVal: gl.getUniformLocation(this.program, "invertVal"),
            saturation: gl.getUniformLocation(this.program, "saturation"),
            contrast: gl.getUniformLocation(this.program, "contrast"),
            gaussianBlur: gl.getUniformLocation(this.program, "gaussianBlur"),
            boxBlur: gl.getUniformLocation(this.program, "boxBlur"),
            sharpen: gl.getUniformLocation(this.program, "sharpen"),
            unsharp: gl.getUniformLocation(this.program, "unsharp"),
            dotScreen: gl.getUniformLocation(this.program, "dotScreen"),
            hexPixel: gl.getUniformLocation(this.program, "hexPixel"),
            pixelate: gl.getUniformLocation(this.program, "pixelate"),
            halftone: gl.getUniformLocation(this.program, "halftone"),
            swirl: gl.getUniformLocation(this.program, "swirl"),
            wave: gl.getUniformLocation(this.program, "wave"),
            rotate3d: gl.getUniformLocation(this.program, "rotate3d"),
            tile: gl.getUniformLocation(this.program, "tile")
        };
    }

    setUniform(name, value) {
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.uniforms[name], value / 100);
    }
}

module.exports = ShaderEffectsExtension;
