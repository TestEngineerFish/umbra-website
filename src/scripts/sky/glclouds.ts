// high 档的云（方案 §3.1 B）：几十行自己写的 WebGL，一个全屏片元着色器算 fBm 云海、云底、两缕近云和满屏云雾。
// 画在一张半分辨率的离屏 WebGL canvas 上，再由 2D 场景 drawImage 叠进来，所以层次顺序和贴图云一样。
//
// 起不来就回 null；运行中上下文丢了，lost 变 true —— 两种情况场景都当场回落到贴图云，不白屏、不报错。

export interface CloudFrame {
  /** 视口（CSS px） */
  w: number;
  h: number;
  /** 云海顶 / 底、近云那一层的屏幕 y（CSS px） */
  top: number;
  bottom: number;
  wisp: number;
  /** 秒；不飘时给 0 */
  t: number;
  fog: number;
  moon: number;
  moonX: number;
  /** 云的光色（0..255） */
  lit: [number, number, number];
  shade: [number, number, number];
}

export interface GLClouds {
  canvas: HTMLCanvasElement;
  render(f: CloudFrame): void;
  readonly lost: boolean;
}

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FRAG = `precision mediump float;
uniform vec2 res;uniform float k,top,bot,wy,t,fog,moon,mx;uniform vec3 lit,shade;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){
  vec2 px=vec2(gl_FragCoord.x,res.y*k-gl_FragCoord.y)/k;float H=res.y;vec2 q=px/H;
  // 云海：上沿按噪声起伏，越往里越暗；云底同理
  float dt=(px.y-top)/H,db=(bot-px.y)/H;
  float nt=fbm(vec2(q.x*2.4+t*.006,q.y*1.4)),nb=fbm(vec2(q.x*2.8-t*.004,q.y*2.2+5.));
  float a=smoothstep(-.015,.07,dt+(nt-.5)*.2)*smoothstep(-.02,.14,db+(nb-.5)*.24);
  float depth=clamp(dt/1.1,0.,1.);
  float light=clamp(1.05-depth*1.25+(nt-.5)*.9-smoothstep(0.,.08,dt)*.2,0.,1.);
  vec3 c=mix(shade,lit,light);
  vec2 m=(px-vec2(mx,top))/H;c+=vec3(.9,.92,1.)*moon*.28*exp(-length(m*vec2(.9,2.6))*2.6)*(1.-depth);
  c*=a;
  // 满屏云雾
  vec3 fc=mix(lit,shade,.3);float fa=fog*.78;c=fc*fa+c*(1.-fa);a=fa+a*(1.-fa);
  // 两缕从镜头前掠过的近云
  for(int i=0;i<2;i++){float fi=float(i);float b=(px.y-wy-fi*.5*H)/H;
    float w=fbm(vec2(q.x*1.2+t*(.012+.007*fi)+fi*3.1,b*3.2+fi*7.));
    float wa=clamp((w-abs(b)*2.4-.24)*2.8,0.,1.)*(.8-.1*fi);
    vec3 wc=mix(shade,lit,.55+w*.5);c=wc*wa+c*(1.-wa);a=wa+a*(1.-wa);}
  gl_FragColor=vec4(c,a);
}`;

/** 渲染分辨率相对 CSS px 的比例：云本来就是软的，半分辨率看不出来，片元数少四倍。 */
const SCALE = 0.5;

export function createGLClouds(): GLClouds | null {
  const canvas = document.createElement('canvas');
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return gl!.getShaderParameter(s, gl!.COMPILE_STATUS) ? s : null;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = Object.fromEntries(['res', 'k', 'top', 'bot', 'wy', 't', 'fog', 'moon', 'mx', 'lit', 'shade'].map((n) => [n, gl!.getUniformLocation(prog, n)]));

  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });

  return {
    canvas,
    get lost() { return lost || gl!.isContextLost(); },
    render(f) {
      if (lost) return;
      const g = gl!;
      const cw = Math.max(1, Math.round(f.w * SCALE)), ch = Math.max(1, Math.round(f.h * SCALE));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      g.viewport(0, 0, cw, ch);
      g.uniform2f(U.res, f.w, f.h);
      g.uniform1f(U.k, cw / f.w);
      g.uniform1f(U.top, f.top);
      g.uniform1f(U.bot, f.bottom);
      g.uniform1f(U.wy, f.wisp);
      g.uniform1f(U.t, f.t);
      g.uniform1f(U.fog, f.fog);
      g.uniform1f(U.moon, f.moon);
      g.uniform1f(U.mx, f.moonX);
      g.uniform3f(U.lit, f.lit[0] / 255, f.lit[1] / 255, f.lit[2] / 255);
      g.uniform3f(U.shade, f.shade[0] / 255, f.shade[1] / 255, f.shade[2] / 255);
      g.drawArrays(g.TRIANGLES, 0, 3);
    },
  };
}
