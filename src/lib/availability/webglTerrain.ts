/**
 * Lightweight WebGL mountain-grid background.
 * Lazy-imported. Graceful no-op when WebGL is unavailable.
 */

export type TerrainHandle = {
  destroy: () => void;
};

type TerrainOptions = {
  canvas: HTMLCanvasElement;
  reducedMotion?: boolean;
};

export function createTerrain(options: TerrainOptions): TerrainHandle | null {
  const { canvas, reducedMotion } = options;
  if (reducedMotion) return null;

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const vs = `
    attribute vec3 aPos;
    uniform mat4 uMVP;
    uniform float uTime;
    uniform vec2 uPointer;
    varying float vElev;
    varying float vFog;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      float a = hash(i); float b = hash(i+vec2(1.,0.));
      float c = hash(i+vec2(0.,1.)); float d = hash(i+vec2(1.,1.));
      vec2 u = f*f*(3.-2.*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
    }
    void main(){
      vec3 p = aPos;
      float n = noise(p.xz * 0.45 + uPointer * 0.35);
      float n2 = noise(p.xz * 1.1 - uTime * 0.03);
      float elev = n * 1.35 + n2 * 0.45;
      p.y += elev;
      // gentle parallax lean from pointer
      p.x += uPointer.x * 0.35;
      p.z += uPointer.y * 0.25;
      vElev = elev;
      vFog = clamp((length(p.xz) - 4.0) / 14.0, 0.0, 1.0);
      gl_Position = uMVP * vec4(p, 1.0);
    }
  `;

  const fs = `
    precision mediump float;
    varying float vElev;
    varying float vFog;
    void main(){
      vec3 low = vec3(0.05, 0.08, 0.12);
      vec3 mid = vec3(0.12, 0.28, 0.32);
      vec3 high = vec3(0.55, 0.78, 0.82);
      vec3 col = mix(low, mid, smoothstep(-0.2, 0.8, vElev));
      col = mix(col, high, smoothstep(0.9, 1.6, vElev) * 0.35);
      col = mix(col, vec3(0.03, 0.04, 0.06), vFog);
      float alpha = 0.55 * (1.0 - vFog * 0.85);
      gl_FragColor = vec4(col, alpha);
    }
  `;

  const prog = compile(gl, vs, fs);
  if (!prog) return null;

  const grid = buildGrid(36, 28, 0.55);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'aPos');
  const uMVP = gl.getUniformLocation(prog, 'uMVP');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uPointer = gl.getUniformLocation(prog, 'uPointer');

  let raf = 0;
  let running = true;
  let pointer = { x: 0, y: 0 };
  let target = { x: 0, y: 0 };
  let start = performance.now();

  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    target.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    target.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    target.x = Math.max(-1, Math.min(1, e.gamma / 35));
    target.y = Math.max(-1, Math.min(1, (e.beta - 45) / 40));
  };

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('deviceorientation', onOrient);

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  const draw = (t: number) => {
    if (!running) return;
    raf = requestAnimationFrame(draw);
    pointer.x += (target.x - pointer.x) * 0.06;
    pointer.y += (target.y - pointer.y) * 0.06;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    const aspect = canvas.width / Math.max(canvas.height, 1);
    const mvp = perspective(48, aspect, 0.1, 60);
    multiply(mvp, lookAt([0, 4.8, 11.5], [0, 0.4, 0], [0, 1, 0]));

    gl.uniformMatrix4fv(uMVP, false, mvp);
    gl.uniform1f(uTime, (t - start) / 1000);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.drawArrays(gl.LINES, 0, grid.length / 3);
  };
  raf = requestAnimationFrame(draw);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}

function buildGrid(cols: number, rows: number, step: number): Float32Array {
  const lines: number[] = [];
  const x0 = (-cols * step) / 2;
  const z0 = (-rows * step) / 2;
  for (let z = 0; z <= rows; z++) {
    for (let x = 0; x < cols; x++) {
      const x1 = x0 + x * step;
      const x2 = x0 + (x + 1) * step;
      const zz = z0 + z * step;
      lines.push(x1, 0, zz, x2, 0, zz);
    }
  }
  for (let x = 0; x <= cols; x++) {
    for (let z = 0; z < rows; z++) {
      const xx = x0 + x * step;
      const z1 = z0 + z * step;
      const z2 = z0 + (z + 1) * step;
      lines.push(xx, 0, z1, xx, 0, z2);
    }
  }
  return new Float32Array(lines);
}

function compile(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string) {
  const vs = shader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = shader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('terrain link failed', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

function shader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('terrain shader failed', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function perspective(fovDeg: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function lookAt(eye: number[], center: number[], up: number[]) {
  const z = normalize([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ]);
}

function multiply(a: Float32Array, b: Float32Array) {
  const ae = a.slice();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      a[c * 4 + r] =
        ae[r] * b[c * 4] +
        ae[4 + r] * b[c * 4 + 1] +
        ae[8 + r] * b[c * 4 + 2] +
        ae[12 + r] * b[c * 4 + 3];
    }
  }
}

function normalize(v: number[]) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function cross(a: number[], b: number[]) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: number[], b: number[]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
