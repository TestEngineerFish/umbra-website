// 深潜首页的场景渲染：一张全屏 canvas，按相机深度把「日落海面 → 海底」画出来。
//
// 画法是 2.5D 分层（草案 §4.2 方案 C，纯程序化、零图片）：每一层有自己的视差系数 f，
// 屏幕 y = 世界 y − ref − (相机 − ref) × f。f < 1 的层（太阳、远山、城市、沙滩）比水线走得慢，
// 于是随下潜一层层「沉」到水面以下 —— 落日、远景消失都不用单独写动画。
//
// 性能规矩（草案 §4.3）：
// - 只画 canvas，不动 DOM 布局；文字全是 HTML。
// - 渐变、路径每帧现算但都很便宜；屏幕外的东西提前 return。
// - 标签页切到后台暂停循环；首帧耗时超标自动降档（tier.ts）。
// - 系统「减少动态效果」→ 不跑循环，只在滚动时重画一帧。

import { buildKeys, camAt, clamp, activeIndex, lerp, type Key } from '../shared/camera';
import { pickTier, TIER_PARAMS, type Tier, type TierParams } from './tier';

/** 每段居中时相机深度（屏高）。改这里就是改「每段之间下潜多远」。 */
export const CAM_K = [0, 0.16, 1.7, 3.2, 4.7, 6.2, 7.35];

export interface OceanOptions {
  canvas: HTMLCanvasElement;
  sections: HTMLElement[];
  zones: string[];
  netLabels: string[];
  readout?: { zone: HTMLElement; ticks: HTMLElement[] };
  /** 测试 / 调试：强制某一档 */
  forceTier?: Tier;
}

type Rand = () => number;

/** 固定种子的伪随机（mulberry32），每次打开画面一样。 */
function rng(seed: number): Rand {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** 一条 0..1 的起伏轮廓（山脊、海床）：几组正弦叠加，rough 越大越碎。 */
function ridge(r: Rand, n: number, rough: number): number[] {
  const p = [r() * 6, r() * 6, r() * 6, r() * 6];
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = Math.sin(u * 5 + p[0]) * 0.45 + Math.sin(u * 13 + p[1]) * 0.3 + Math.sin(u * 29 + p[2]) * 0.17 * rough + Math.sin(u * 61 + p[3]) * 0.08 * rough;
    out.push(0.5 + v * 0.55);
  }
  return out;
}

interface Building { x: number; w: number; h: number; wins: [number, number, number][] }
interface Glint { u: number; o: number; l: number; p: number }
interface Snow { x: number; y: number; f: number; rad: number; v: number; bio: boolean; p: number }
interface Fish { ox: number; oy: number; s: number; p: number }
interface Jelly { x: number; y: number; s: number; f: number; p: number }
interface Node { x: number; y: number; label: string; big?: boolean }

const BOATS = [
  { x: 0.15, dy: 0.014, s: 0.42, k: 'sail', p: 0 },
  { x: 0.31, dy: 0.004, s: 0.24, k: 'motor', p: 1.3 },
  { x: 0.55, dy: 0.034, s: 0.75, k: 'sail', p: 2.1 },
  { x: 0.82, dy: 0.075, s: 1.15, k: 'motor', p: 3.7 },
] as const;

const PALMS = [
  { x: 0.07, h: 0.07, lean: 0.5 },
  { x: 0.12, h: 0.055, lean: -0.3 },
  { x: 0.21, h: 0.045, lean: 0.4 },
];

export function startOcean(opt: OceanOptions): () => void {
  const { canvas: cv, sections } = opt;
  const ctx = cv.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  let tier: Tier = opt.forceTier ?? pickTier({ reducedMotion: reduced, cores: nav.hardwareConcurrency, memory: nav.deviceMemory, shortSide: Math.min(innerWidth, innerHeight) });
  let P: TierParams = TIER_PARAMS[tier];
  document.documentElement.dataset.oceanTier = tier;

  let W = 0, H = 0, keys: Key[] = [];
  let camCur = 0, mx = 0, mxs = 0, t = 0;
  let WL = 0, SB = 0, A: number[] = [];
  let farM: number[] = [], nearM: number[] = [], city: Building[] = [], glitter: Glint[] = [];
  let snow: Snow[] = [], fish: Fish[] = [], seabed: number[] = [];
  const jellies: Jelly[] = [
    { x: 0.7, y: -0.22, s: 1.1, f: 0.85, p: 0 },
    { x: 0.84, y: 0.06, s: 0.7, f: 0.95, p: 2 },
    { x: 0.6, y: 0.2, s: 0.55, f: 1.1, p: 4 },
    { x: 0.9, y: -0.36, s: 0.45, f: 0.8, p: 1 },
  ];
  const L = opt.netLabels;
  const nodes: Node[] = [
    { x: 0.5, y: -0.1, label: L[0], big: true }, { x: 0.2, y: -0.07, label: L[1] }, { x: 0.34, y: -0.22, label: L[2] },
    { x: 0.67, y: -0.24, label: L[3] }, { x: 0.83, y: -0.08, label: L[4] }, { x: 0.58, y: -0.4, label: L[5] }, { x: 0.4, y: -0.42, label: L[6] },
  ];
  let edges: { a: number; b: number; p: number }[] = [];

  function build() {
    const r = rng(7);
    farM = ridge(r, 90, 1);
    nearM = ridge(r, 70, 1.6);
    city = [];
    for (let x = 0.56; x < 0.9;) {
      const w = 0.006 + r() * 0.016;
      const h = (0.025 + Math.pow(r(), 1.6) * 0.09) * (1 - Math.abs(x - 0.72) * 2.2);
      const wins: [number, number, number][] = [];
      for (let k = 0; k < 6; k++) wins.push([r(), r(), r() * 6]);
      city.push({ x, w, h: Math.max(0.012, h), wins });
      x += w + r() * 0.003;
    }
    glitter = Array.from({ length: P.glitter }, () => ({ u: r(), o: r() - 0.5, l: 4 + r() * 18, p: r() * 6 }));
    snow = Array.from({ length: P.snow }, () => ({ x: r(), y: r(), f: 0.5 + r() * 0.9, rad: 0.5 + r() * 1.6, v: 4 + r() * 10, bio: r() < 0.16, p: r() * 6 }));
    fish = Array.from({ length: P.fish }, () => {
      const a = r() * 6.28, d = Math.sqrt(r());
      return { ox: Math.cos(a) * d, oy: Math.sin(a) * d * 0.45, s: 0.7 + r() * 0.6, p: r() * 6 };
    });
    edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [3, 5], [1, 2], [3, 4], [2, 6], [6, 0]].map(([a, b]) => ({ a, b, p: r() }));
    seabed = ridge(r, 80, 1.3);
  }

  function layout() {
    W = innerWidth;
    H = document.documentElement.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, P.dprCap);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    const docH = document.documentElement.scrollHeight;
    keys = buildKeys(
      sections.map((s) => ({ top: s.offsetTop, height: s.offsetHeight })),
      H, docH, CAM_K,
    );
    WL = 0.6 * H;
    SB = CAM_K[6] * H + 0.7 * H;
    A = CAM_K.map((k) => k * H + 0.5 * H);
    camCur = camAt(keys, scrollY);
  }

  /** 视差：ref 是该层「设计位置」对应的相机深度，f 是相对相机的移动速度。 */
  const par = (wy: number, f: number, ref = 0) => wy - ref - (camCur - ref) * f;

  // ── 水面以上 ────────────────────────────────────────────────────────────

  function drawSky(wl: number): number {
    const c = ctx!;
    const g = c.createLinearGradient(0, wl - H * 0.75, 0, wl);
    g.addColorStop(0, '#24182f'); g.addColorStop(0.38, '#5b2338'); g.addColorStop(0.68, '#b8461d'); g.addColorStop(0.88, '#ec7a32'); g.addColorStop(1, '#f9c08a');
    c.fillStyle = g; c.fillRect(0, 0, W, wl + 2);
    // 太阳最远、几乎不动，于是随下潜「落」进海里
    const sx = W * 0.42 - mxs * 4, sy = par(WL, 0.22) - H * 0.035, sr = Math.max(26, H * 0.055);
    const gl = c.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 6);
    gl.addColorStop(0, 'rgba(255,214,160,.75)'); gl.addColorStop(0.25, 'rgba(255,150,80,.28)'); gl.addColorStop(1, 'rgba(255,120,60,0)');
    c.fillStyle = gl; c.fillRect(0, 0, W, wl + 2);
    c.fillStyle = '#ffe1bd'; c.beginPath(); c.arc(sx, sy, sr, 0, 6.29); c.fill();
    return sx;
  }

  function drawRange(pts: number[], base: number, amp: number, color: string, x0: number, x1: number, dx: number) {
    const c = ctx!;
    c.fillStyle = color; c.beginPath(); c.moveTo(W * x0 + dx, base + H);
    const n = pts.length - 1;
    for (let i = 0; i <= n; i++) c.lineTo(W * lerp(x0, x1, i / n) + dx, base - pts[i] * amp);
    c.lineTo(W * x1 + dx, base + H); c.closePath(); c.fill();
  }

  function drawLand() {
    const c = ctx!;
    drawRange(farM, par(WL, 0.3), H * 0.17, '#4a2238', 0, 1, -mxs * 6);
    drawRange(nearM, par(WL, 0.42), H * 0.085, '#33182a', -0.05, 0.5, -mxs * 9);
    const cb = par(WL, 0.5), dx = -mxs * 11;
    c.fillStyle = '#2a1424';
    for (const b of city) c.fillRect(b.x * W + dx, cb - b.h * H, b.w * W + 0.6, b.h * H + H);
    c.fillStyle = 'rgba(255,186,120,.85)';
    for (const b of city) for (const w of b.wins) {
      if (Math.sin(t * 0.4 + w[2]) <= -0.6) continue;
      c.fillRect(b.x * W + dx + w[0] * b.w * W * 0.8, cb - b.h * H * (0.15 + w[1] * 0.8), 1.4, 1.4);
    }
    // 沙滩与椰子树
    const bb = par(WL, 0.72), bx = -mxs * 16;
    const sg = c.createLinearGradient(0, bb - H * 0.05, 0, bb + 6);
    sg.addColorStop(0, '#d98756'); sg.addColorStop(1, '#8c4429');
    c.fillStyle = sg; c.beginPath(); c.moveTo(-20 + bx, bb - H * 0.045);
    c.quadraticCurveTo(W * 0.16 + bx, bb - H * 0.03, W * 0.34 + bx, bb + 1); c.lineTo(W * 0.34 + bx, bb + H); c.lineTo(-20, bb + H); c.fill();
    c.strokeStyle = '#22121b'; c.lineCap = 'round';
    for (const p of PALMS) {
      const x = p.x * W + bx, y0 = bb - H * 0.04 + (p.x - 0.07) * H * 0.1, h = p.h * H, tx = x + p.lean * h * 0.5, ty = y0 - h;
      c.lineWidth = Math.max(1.5, h * 0.05); c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(x + p.lean * h * 0.1, y0 - h * 0.6, tx, ty); c.stroke();
      c.lineWidth = Math.max(1, h * 0.03);
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.55 + Math.sin(t * 0.8 + k) * 0.04, len = h * 0.45;
        c.beginPath(); c.moveTo(tx, ty);
        c.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - len * 0.15, tx + Math.cos(a) * len, ty + Math.sin(a) * len + len * 0.35);
        c.stroke();
      }
    }
  }

  // ── 水 ──────────────────────────────────────────────────────────────────

  function drawWater(wl: number, sb: number) {
    const c = ctx!, top = Math.max(wl, 0);
    // 一条从水线拉到海床的渐变；颜色随深度连续变，最后落到 Umbra 暖黑 #15110E
    const g = c.createLinearGradient(0, wl, 0, sb);
    g.addColorStop(0, '#3b3352'); g.addColorStop(0.03, '#2a3150'); g.addColorStop(0.1, '#1b3a55'); g.addColorStop(0.22, '#123a52'); g.addColorStop(0.42, '#0b2438');
    g.addColorStop(0.62, '#081525'); g.addColorStop(0.82, '#0c0e14'); g.addColorStop(1, '#15110E');
    c.fillStyle = g; c.fillRect(0, top, W, H - top + 1);
  }

  function drawSurface(wl: number, sx: number) {
    if (wl > H + 40 || wl < -H * 0.5) return;
    const c = ctx!;
    // 天光：贴着水线一窄条暖色；太阳正下方一道更亮的反光柱（只在这一处暖，别的水面保持冷色，不发灰）
    const rg = c.createLinearGradient(0, wl, 0, wl + H * 0.12);
    rg.addColorStop(0, 'rgba(236,122,50,.32)'); rg.addColorStop(1, 'rgba(236,122,50,0)');
    c.fillStyle = rg; c.fillRect(0, wl, W, H * 0.12);
    c.save(); c.translate(sx, wl); c.scale(1, 2.4);
    const col = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.16);
    col.addColorStop(0, 'rgba(255,150,80,.38)'); col.addColorStop(0.5, 'rgba(236,110,45,.12)'); col.addColorStop(1, 'rgba(236,110,45,0)');
    c.fillStyle = col; c.fillRect(-W * 0.16, 0, W * 0.32, W * 0.16);
    c.restore();
    for (const g of glitter) {
      const y = wl + g.u * g.u * H * 0.32 + 2, a = 0.5 + 0.5 * Math.sin(t * 2.4 + g.p);
      if (a < 0.35) continue;
      c.fillStyle = `rgba(255,214,170,${(a - 0.3) * (1 - g.u * 0.7)})`;
      c.fillRect(sx + g.o * W * (0.06 + g.u * 0.32), y, g.l * (1 - g.u * 0.5), 1.2);
    }
    c.strokeStyle = 'rgba(255,224,196,.55)'; c.lineWidth = 1; c.beginPath();
    for (let x = 0; x <= W; x += 12) {
      const y = wl + Math.sin(x * 0.02 + t * 1.3) * 1.4;
      if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  }

  function boatShape(s: number, kind: string) {
    const c = ctx!;
    c.beginPath();
    c.moveTo(-34 * s, -5 * s); c.lineTo(38 * s, -7 * s); c.lineTo(28 * s, 3 * s); c.lineTo(-28 * s, 3 * s); c.closePath(); c.fill();
    if (kind === 'sail') {
      c.fillRect(-1 * s, -64 * s, 2 * s, 60 * s);
      c.beginPath(); c.moveTo(3 * s, -62 * s); c.lineTo(3 * s, -10 * s); c.lineTo(32 * s, -11 * s); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-3 * s, -56 * s); c.lineTo(-3 * s, -11 * s); c.lineTo(-26 * s, -11 * s); c.closePath(); c.fill();
    } else {
      c.fillRect(-16 * s, -19 * s, 26 * s, 13 * s);
      c.fillRect(-4 * s, -27 * s, 3 * s, 9 * s);
    }
  }

  /** 船 = 你的各台设备；桅顶那盏橙灯，到海底会变成网上的节点。 */
  function drawBoats(wl: number) {
    if (wl > H + 80 || wl < -60) return;
    const c = ctx!, k = W < 600 ? 0.75 : 1;
    for (const b of BOATS) {
      const s = b.s * k;
      const x = b.x * W - mxs * 24 * s, y = wl + b.dy * H + Math.sin(t * 1.1 + b.p) * 1.6 * s;
      c.save(); c.translate(x, y); c.rotate(Math.sin(t * 0.9 + b.p) * 0.025);
      c.fillStyle = 'rgba(20,12,16,.28)'; c.save(); c.scale(1, -0.55); boatShape(s, b.k); c.restore();
      c.fillStyle = '#1a1015'; boatShape(s, b.k);
      c.fillStyle = `rgba(255,140,60,${0.55 + 0.45 * Math.sin(t * 2 + b.p)})`;
      c.beginPath(); c.arc(b.k === 'sail' ? 0 : -2.5 * s, b.k === 'sail' ? -66 * s : -28 * s, Math.max(1.6, 2.4 * s), 0, 6.29); c.fill();
      c.restore();
    }
  }

  function drawRays(wl: number) {
    const fade = clamp(1 - (camCur - WL) / (H * 2.6), 0, 1) * clamp((camCur - WL * 0.2) / (H * 0.25), 0, 1);
    if (fade <= 0) return;
    const c = ctx!;
    for (let i = 0; i < 7; i++) {
      const x = W * (0.08 + i * 0.14) + Math.sin(t * 0.25 + i * 1.7) * W * 0.03 - mxs * 10;
      const w = W * (0.025 + (i % 3) * 0.015), len = H * (1.4 + (i % 2) * 0.5);
      const g = c.createLinearGradient(0, wl, 0, wl + len);
      g.addColorStop(0, `rgba(255,232,205,${0.16 * fade})`); g.addColorStop(1, 'rgba(255,232,205,0)');
      c.fillStyle = g; c.beginPath();
      c.moveTo(x - w / 2, wl); c.lineTo(x + w / 2, wl); c.lineTo(x + w * 1.8 + len * 0.12, wl + len); c.lineTo(x - w * 0.6 + len * 0.12, wl + len); c.fill();
    }
  }

  /** 海雪：暮光层以下多起来；午夜层里约四分之一变成会闪的生物光。 */
  function drawSnow(wl: number) {
    if (!snow.length) return;
    const c = ctx!;
    const deep = clamp((camCur - CAM_K[3] * H) / ((CAM_K[4] - CAM_K[3]) * H), 0, 1);
    const twi = clamp((camCur - CAM_K[2] * H) / (H * 1.2), 0, 1);
    const span = H + 40;
    for (const s of snow) {
      let y = (s.y * span * 3 - camCur * s.f + t * s.v) % span;
      if (y < 0) y += span;
      y -= 20;
      if (y < wl + 4) continue;
      const x = s.x * W - mxs * 14 * s.f;
      if (s.bio && deep > 0) {
        const a = deep * (0.35 + 0.65 * Math.max(0, Math.sin(t * 1.3 + s.p * 3)));
        c.fillStyle = `rgba(232,89,12,${a * 0.13})`; c.beginPath(); c.arc(x, y, s.rad * 5, 0, 6.29); c.fill();
        c.fillStyle = `rgba(255,200,150,${a})`; c.beginPath(); c.arc(x, y, s.rad * 1.1, 0, 6.29); c.fill();
      } else {
        c.fillStyle = `rgba(220,235,240,${(0.18 + twi * 0.3) * (1 - deep * 0.5)})`;
        c.fillRect(x, y, s.rad, s.rad);
      }
    }
  }

  /** 透光层的鱼群 = 正在跑的任务。 */
  function drawFish() {
    if (!fish.length) return;
    const cy = A[2] - camCur;
    if (cy < -H * 0.6 || cy > H * 1.6) return;
    const c = ctx!;
    const cx = W * 0.68 + Math.sin(t * 0.17) * W * 0.12 - mxs * 18;
    const dir = Math.cos(t * 0.17) >= 0 ? 1 : -1, yy = cy + Math.sin(t * 0.29) * H * 0.06, R = Math.min(W, 900) * 0.2;
    c.fillStyle = '#081c29';
    for (const f of fish) {
      const x = cx + f.ox * R + Math.sin(t * 1.7 + f.p) * 6, y = yy + f.oy * R + Math.cos(t * 1.3 + f.p) * 4, s = f.s;
      c.save(); c.translate(x, y); c.scale(dir, 1);
      c.beginPath(); c.ellipse(0, 0, 9 * s, 3.2 * s, 0, 0, 6.29); c.fill();
      const wag = Math.sin(t * 9 + f.p * 4) * 1.6 * s;
      c.beginPath(); c.moveTo(-7 * s, 0); c.lineTo(-14 * s, -4 * s + wag); c.lineTo(-14 * s, 4 * s + wag); c.fill();
      c.restore();
    }
  }

  function drawJellies() {
    const c = ctx!, ref = CAM_K[3] * H, k = W < 600 ? 0.8 : 1;
    for (const j of jellies) {
      const x = j.x * W - mxs * 12 * j.f, y = par(A[3] + j.y * H, j.f, ref) + Math.sin(t * 0.6 + j.p) * 10;
      if (y < -120 || y > H + 160) continue;
      const pulse = 1 + Math.sin(t * 1.8 + j.p) * 0.08, r = 22 * j.s * pulse * k;
      const g = c.createRadialGradient(x, y, 0, x, y, r * 3.2);
      g.addColorStop(0, 'rgba(240,168,120,.22)'); g.addColorStop(1, 'rgba(240,168,120,0)');
      c.fillStyle = g; c.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
      c.fillStyle = 'rgba(255,214,190,.32)'; c.beginPath(); c.ellipse(x, y, r, (r * 0.78) / pulse, 0, Math.PI, 0); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,214,190,.28)'; c.lineWidth = 1;
      for (let q = 0; q < 5; q++) {
        const tx = x - r * 0.7 + q * r * 0.35;
        c.beginPath(); c.moveTo(tx, y);
        for (let z = 1; z <= 6; z++) c.lineTo(tx + Math.sin(t * 1.6 + q + z * 0.7 + j.p) * 3 * j.s, y + z * r * 0.42);
        c.stroke();
      }
    }
  }

  /** 午夜层的灯笼鱼：保险箱那一段唯一的光源。 */
  function drawLure() {
    const x = W * 0.72 - mxs * 16, y = A[4] + H * 0.04 - camCur + Math.sin(t * 0.5) * 8;
    if (y < -200 || y > H + 200) return;
    const c = ctx!, a = 0.7 + 0.3 * Math.sin(t * 2.1);
    const g = c.createRadialGradient(x, y, 0, x, y, 120);
    g.addColorStop(0, `rgba(232,89,12,${0.38 * a})`); g.addColorStop(1, 'rgba(232,89,12,0)');
    c.fillStyle = g; c.fillRect(x - 120, y - 120, 240, 240);
    c.fillStyle = 'rgba(240,168,120,.07)'; c.beginPath(); c.ellipse(x - 44, y + 26, 46, 28, -0.15, 0, 6.29); c.fill();
    c.strokeStyle = 'rgba(240,168,120,.18)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 30, y + 4); c.quadraticCurveTo(x - 18, y - 16, x, y); c.stroke();
    c.fillStyle = `rgba(255,224,190,${a})`; c.beginPath(); c.arc(x, y, 3.4, 0, 6.29); c.fill();
  }

  /** 深渊到海底：一张发光的设备网，每个节点往上伸一根线，连着海面上的船。 */
  function drawFloor() {
    const sb = SB - camCur;
    if (sb > H * 1.8) return;
    const c = ctx!;
    const on = clamp((camCur - CAM_K[4] * H) / ((CAM_K[5] - CAM_K[4]) * H), 0, 1);
    const gx = W > 900 ? W * 0.71 : W * 0.5;
    const gg = c.createRadialGradient(gx, sb, 0, gx, sb, Math.max(W, H) * 0.7);
    gg.addColorStop(0, `rgba(232,89,12,${0.2 * on})`); gg.addColorStop(1, 'rgba(232,89,12,0)');
    c.fillStyle = gg; c.fillRect(0, sb - H, W, H * 2);
    // 宽屏把网收在右半边，左边留给文案和下载卡；窄屏铺满（文案在上、网在下，不打架）
    const wide = W > 900;
    const nx = (x: number) => (wide ? 0.44 + x * 0.54 : x) * W - mxs * 8;
    const pos = nodes.map((n) => [nx(n.x), sb + n.y * H] as const);
    for (const [x, y] of pos) {
      const g = c.createLinearGradient(0, y, 0, y - H * 1.3);
      g.addColorStop(0, `rgba(240,168,120,${0.28 * on})`); g.addColorStop(1, 'rgba(240,168,120,0)');
      c.fillStyle = g; c.fillRect(x - 0.5, y - H * 1.3, 1, H * 1.3);
    }
    c.lineWidth = 1;
    for (const e of edges) {
      const [ax, ay] = pos[e.a], [bx, by] = pos[e.b];
      c.strokeStyle = `rgba(240,168,120,${0.32 * on})`; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      const u = (t * 0.22 + e.p) % 1;
      c.fillStyle = `rgba(255,190,130,${on})`; c.beginPath(); c.arc(lerp(ax, bx, u), lerp(ay, by, u), 1.8, 0, 6.29); c.fill();
    }
    c.font = '12px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
    c.textAlign = 'center';
    nodes.forEach((n, i) => {
      const [x, y] = pos[i], r = n.big ? 6.5 : 4.2, br = 0.75 + 0.25 * Math.sin(t * 2 + i);
      const g = c.createRadialGradient(x, y, 0, x, y, r * 6);
      g.addColorStop(0, `rgba(232,89,12,${0.45 * on * br})`); g.addColorStop(1, 'rgba(232,89,12,0)');
      c.fillStyle = g; c.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
      c.fillStyle = `rgba(232,89,12,${on})`; c.beginPath(); c.arc(x, y, r, 0, 6.29); c.fill();
      c.fillStyle = `rgba(255,226,200,${on})`; c.beginPath(); c.arc(x, y, r * 0.4, 0, 6.29); c.fill();
      c.fillStyle = `rgba(237,234,227,${0.78 * on})`; c.fillText(n.label, x, y + r + 16);
    });
    const n = seabed.length - 1;
    c.fillStyle = '#15110E'; c.beginPath(); c.moveTo(-10, H + 10);
    for (let i = 0; i <= n; i++) c.lineTo((W * i) / n, sb + H * 0.06 + seabed[i] * H * 0.07);
    c.lineTo(W + 10, H + 10); c.closePath(); c.fill();
    c.strokeStyle = `rgba(240,168,120,${0.22 * on})`; c.beginPath();
    for (let i = 0; i <= n; i++) {
      const y = sb + H * 0.06 + seabed[i] * H * 0.07;
      if (i === 0) c.moveTo(0, y); else c.lineTo((W * i) / n, y);
    }
    c.stroke();
  }

  function drawVignette(wl: number) {
    const under = clamp((H * 0.5 - wl) / H, 0, 1);
    if (under <= 0) return;
    const c = ctx!, d = clamp(camCur / (CAM_K[6] * H), 0, 1);
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(5,4,3,${under * (0.2 + d * 0.45)})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  function frame() {
    const wl = WL - camCur, sb = SB - camCur;
    let sx = W * 0.42;
    if (wl > 0) { sx = drawSky(wl); drawLand(); }
    drawWater(wl, sb);
    drawSurface(wl, sx);
    drawBoats(wl);
    drawRays(wl);
    drawSnow(wl);
    drawFish();
    drawJellies();
    drawLure();
    drawFloor();
    drawVignette(wl);
  }

  // ── 刻度尺 ──────────────────────────────────────────────────────────────

  let lastOn = -1;
  function hud() {
    const r = opt.readout;
    if (!r) return;
    const on = activeIndex(keys, scrollY);
    if (on !== lastOn) {
      r.ticks.forEach((b, i) => b.toggleAttribute('aria-current', i === on));
      r.zone.textContent = opt.zones[on] ?? '';
      lastOn = on;
    }
  }

  // ── 循环 ────────────────────────────────────────────────────────────────

  let raf = 0, last = 0, frames = 0, slowSum = 0;
  function loop(now: number) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    t += dt;
    const target = camAt(keys, scrollY);
    camCur += (target - camCur) * Math.min(1, dt * 7); // 背景带一点惯性，比内容慢半拍
    mxs += (mx - mxs) * Math.min(1, dt * 3);
    const t0 = performance.now();
    frame();
    hud();
    // 前 30 帧量一下真实耗时：太慢就降一档（只降不升，免得来回抖）
    if (frames < 30) {
      slowSum += performance.now() - t0;
      if (++frames === 30) {
        const next = pickTier({ reducedMotion: false, cores: nav.hardwareConcurrency, memory: nav.deviceMemory, shortSide: Math.min(W, H), firstFrameMs: slowSum / 30 });
        const order: Tier[] = ['high', 'mid', 'low'];
        if (!opt.forceTier && order.indexOf(next) > order.indexOf(tier)) {
          tier = next; P = TIER_PARAMS[tier];
          document.documentElement.dataset.oceanTier = tier;
          build(); layout();
        }
      }
    }
    raf = requestAnimationFrame(loop);
  }

  function still() {
    camCur = camAt(keys, scrollY);
    frame();
    hud();
  }

  const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse') mx = (e.clientX / W - 0.5) * 2; };
  const onVis = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) { last = 0; raf = requestAnimationFrame(loop); }
  };
  let lastW = innerWidth, lastH = document.documentElement.clientHeight;
  const onResize = () => {
    const w = innerWidth, h = document.documentElement.clientHeight;
    if (w === lastW && Math.abs(h - lastH) < 120) return; // 手机地址栏伸缩不重排
    lastW = w; lastH = h;
    layout();
    if (!P.animate) still();
  };
  const onLoad = () => { layout(); if (!P.animate) still(); };

  build();
  layout();
  addEventListener('resize', onResize);
  addEventListener('load', onLoad);
  if (P.animate) {
    raf = requestAnimationFrame(loop);
    if (P.parallax) addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVis);
  } else {
    still();
    addEventListener('scroll', still, { passive: true });
  }

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', onResize);
    removeEventListener('load', onLoad);
    removeEventListener('pointermove', onMove);
    removeEventListener('scroll', still);
    document.removeEventListener('visibilitychange', onVis);
  };
}

