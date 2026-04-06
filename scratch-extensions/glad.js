class GLSandboxExtension {
  constructor(runtime) {
    this.runtime = runtime;
    this.gl = runtime.renderer._gl;
    this.program = this._createProgram();
    this.uniforms = {};
  }

  getInfo() {
    return {
      id: 'glsandbox',
      name: 'GL Sandbox',
      blocks: [
        {
          opcode: 'setEffect',
          blockType: Scratch.BlockType.COMMAND,
          text: 'set [EFFECT] to [VALUE]',
          arguments: {
            EFFECT: { type: Scratch.ArgumentType.STRING, menu: 'effects' },
            VALUE: { type: Scratch.ArgumentType.NUMBER }
          }
        },
        {
          opcode: 'setColor',
          blockType: Scratch.BlockType.COMMAND,
          text: 'set [COLOR] to [VALUE]',
          arguments: {
            COLOR: { type: Scratch.ArgumentType.STRING, menu: 'colors' },
            VALUE: { type: Scratch.ArgumentType.STRING }
          }
        }
      ],
      menus: {
        effects: {
          acceptReporters: true,
          items: [
            'hue','saturation','lightness','whirl','waveX','waveY','chromatic',
            'fisheye','ghost','pixelate','rotate','invert','halftone','noise',
            'sharpen','unsharp','turbulence','red','green','blue','temperature',
            'blur','shearX','shearY','gblur'
          ]
        },
        colors: {
          acceptReporters: true,
          items: ['tint1','tint2']
        }
      }
    };
  }

  setEffect(args) {
    this.uniforms[args.EFFECT] = Math.max(-100, Math.min(100, Number(args.VALUE)));
  }

  setColor(args) {
    this.uniforms[args.COLOR] = args.VALUE;
  }

  _createProgram() {
    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        gl_Position = vec4(a_position,0.0,1.0);
      }
    `);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_tex;

      uniform float hue;
      uniform float saturation;
      uniform float lightness;
      uniform float whirl;
      uniform float waveX;
      uniform float waveY;
      uniform float chromatic;
      uniform float fisheye;
      uniform float ghost;
      uniform float pixelate;
      uniform float rotate;
      uniform float invert;
      uniform float halftone;
      uniform float noise;
      uniform float sharpen;
      uniform float unsharp;
      uniform float turbulence;
      uniform float red;
      uniform float green;
      uniform float blue;
      uniform float temperature;
      uniform float blur;
      uniform float shearX;
      uniform float shearY;
      uniform float gblur;

      uniform vec3 tint1;
      uniform vec3 tint2;

      float rand(vec2 co){
        return fract(sin(dot(co.xy,vec2(12.9898,78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = v_uv;

        uv += vec2(waveX, waveY) * 0.01 * sin(uv.yx * 10.0);

        uv = (uv - 0.5) * mat2(cos(rotate), -sin(rotate), sin(rotate), cos(rotate)) + 0.5;

        uv.x += shearX * (uv.y - 0.5);
        uv.y += shearY * (uv.x - 0.5);

        vec4 col = texture2D(u_tex, uv);

        col.rgb += vec3(red, green, blue) / 100.0;

        float angle = hue * 3.14159 / 180.0;
        mat3 hueMat = mat3(
          vec3(0.299 + 0.701*cos(angle) + 0.168*sin(angle),
               0.587 - 0.587*cos(angle) + 0.330*sin(angle),
               0.114 - 0.114*cos(angle) - 0.497*sin(angle)),
          vec3(0.299 - 0.299*cos(angle) - 0.328*sin(angle),
               0.587 + 0.413*cos(angle) + 0.035*sin(angle),
               0.114 - 0.114*cos(angle) + 0.292*sin(angle)),
          vec3(0.299 - 0.300*cos(angle) + 1.250*sin(angle),
               0.587 - 0.588*cos(angle) - 1.050*sin(angle),
               0.114 + 0.886*cos(angle) - 0.203*sin(angle))
        );
        col.rgb = clamp(hueMat * col.rgb, 0.0, 1.0);

        col.rgb = mix(vec3(dot(col.rgb, vec3(0.333))), col.rgb, (saturation+100.0)/100.0);

        col.rgb += lightness/100.0;

        if(invert > 0.0) col.rgb = 1.0 - col.rgb;

        col.rgb = mix(col.rgb, vec3(rand(uv)), noise/100.0);

        col.rgb = mix(col.rgb, tint1, 0.01);
        col.rgb = mix(col.rgb, tint2, 0.01);

        col.a *= 1.0 - ghost/100.0;

        gl_FragColor = col;
      }
    `);
    gl.compileShader(fs);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    return program;
  }
}

Scratch.extensions.register(new GLSandboxExtension(Scratch.vm.runtime));
