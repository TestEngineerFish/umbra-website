// 首页「从星空落到枝头」的场景渲染：一张全屏 canvas，按相机位置把夜空 → 云海 → 黎明 → 林梢 → 枝头画出来。
//
// 画法是 2.5D 分层（方案 §3.2，A 为主）：每个元素挂在某一层（按层 id 找，见 layers.ts）上，
// 有自己的视差系数 f。屏幕 y = 设计位置 − (相机 − 该层相机) × f：f 小的（星空、远山）几乎不动，
// f = 1 的（云海、枝条）跟着相机走。天色、星空、月光、晨光、云雾的浓淡都从 LAYERS 插值。
//
// 四个绘制器：stars（星点、银河、流星、月亮）、clouds（云海、穿云）、horizon（远山、林梢、晨雾）、branch（枝条、叶子）。
// 当前相机落在哪两层之间，就只开这两层用到的绘制器。
//
// 性能规矩（方案 §3.3）：
// - 只画 canvas，不动 DOM 布局；文字全是 HTML。
// - 云和银河是启动时生成的贴图，运行时只平移、改透明度。
// - 标签页切到后台暂停循环；首帧耗时超标自动降档（tier.ts）。
// - 系统「减少动态效果」→ 不跑循环，只在滚动时重画一帧，星星不闪、没有流星。

import { buildKeys, camAt, clamp, activeIndex, lerp, type Key } from '../shared/camera';
import { LAYERS, drawerOn, hex, mix, progress, rgb, skyAt, weightAt, type Drawer } from './layers';
import { pickTier, TIER_PARAMS, type Tier, type TierParams } from './tier';
import { cloudPair, glowSprite, milkyWay, ridge, rng } from './textures';

export interface SkyOptions {
  canvas: HTMLCanvasElement;
  sections: HTMLElement[];
  /** 刻度尺：读数格写层名，刻度高亮当前段。 */
  readout?: { zone: HTMLElement; names: string[]; ticks: HTMLElement[] };
  /** 测试 / 调试：强制某一档 */
  forceTier?: Tier;
  /** 测量：把每帧绘制耗时（ms）记到 window.__skyPerf */
  perf?: boolean;
}

interface Star { x: number; y: number; r: number; l: number; a: number; p: number; v: number; th: number; big: boolean }
interface Meteor { x: number; y: number; vx: number; vy: number; age: number; life: number }
interface Leaf { u: number; side: number; len: number; p: number }

type RGB = [number, number, number];

// 云的光色：月光下的顶 / 背光；晨光下的顶 / 背光（占位色，待设计侧裁）。
const CLOUD_NIGHT: [string, string] = ['#96a0c6', '#282e58'];
const CLOUD_DAWN: [string, string] = ['#f8ceba', '#806a8e'];

/** 每层在屏幕上的设计位置与视差系数：[挂在哪层, 设计 y（屏高）, f]。 */
const PLACE = {
  moon: ['above-clouds', 0.2, 0.22],
  deck: ['above-clouds', 0.62, 1],
  wisp: ['in-clouds', 0.3, 1.7],
  far: ['dawn', 0.7, 0.05],
  mid: ['dawn', 0.77, 0.08],
  near: ['dawn', 0.84, 0.12],
  crownBack: ['treetops', 0.8, 0.24],
  crownFront: ['treetops', 0.92, 0.32],
  mist: ['treetops', 0.76, 0.17],
  birds: ['treetops', 0.3, 0.3],
  branch: ['branch', 0.42, 1],
  branchNarrow: ['branch', 0.24, 1],
} as const;

/** 云海从顶到底有多厚（屏高）：在云海那一层看得见顶，穿云那一层整屏在云里，黎明那一层刚好出云。 */
const DECK = 1.68;

export function startSky(opt: SkyOptions): () => void {
  const { canvas: cv, sections } = opt;
  const ctx = cv.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  let tier: Tier = opt.forceTier ?? pickTier({ reducedMotion: reduced, cores: nav.hardwareConcurrency, memory: nav.deviceMemory, shortSide: Math.min(innerWidth, innerHeight) });
  let P: TierParams = TIER_PARAMS[tier];
  const root = document.documentElement;
  root.dataset.skyTier = tier;

  let W = 0, H = 0, keys: Key[] = [];
  let camCur = 0, mx = 0, mxs = 0, t = 0;
  let stars: Star[] = [], far: number[] = [], mid: number[] = [], near: number[] = [];
  let crownBack: [number, number][] = [], crownFront: [number, number][] = [], leaves: Leaf[] = [];
  let decks: [HTMLCanvasElement, HTMLCanvasElement][] = [], wisp: [HTMLCanvasElement, HTMLCanvasElement] | null = null;
  const meteors: Meteor[] = [];
  let nextMeteor = 4;
  const milky = milkyWay(rng(11)), glow = glowSprite();
  const camOf: Record<string, number> = {};

  function buildClouds() {
    const r = rng(23), small = tier === 'low';
    const NIGHT: [RGB, RGB] = [hex(CLOUD_NIGHT[0]), hex(CLOUD_NIGHT[1])], DAWN: [RGB, RGB] = [hex(CLOUD_DAWN[0]), hex(CLOUD_DAWN[1])];
    const w = small ? 256 : 512, h = small ? 64 : 128;
    decks = [0.0, 0.12, 0.24].map((cover) => cloudPair(r, w, h, { kind: 'deck', cover }, NIGHT, DAWN));
    wisp = cloudPair(r, w, h, { kind: 'wisp' }, NIGHT, DAWN);
  }

  function build() {
    const r = rng(7);
    const area = clamp((innerWidth * innerHeight) / 1.3e6, 0.45, 1.2);
    const n = Math.round(420 * P.stars * area * (P.starLayers === 1 ? 0.5 : 1));
    stars = Array.from({ length: n }, () => {
      // 三成的星挤在银河那条对角带附近
      let x = r(), y = r();
      if (r() < 0.3) { const u = r(); x = u + (r() - 0.5) * 0.18; y = 1 - u + (r() - 0.5) * 0.18; }
      const big = r() < 0.06;
      return { x, y, r: big ? 1.6 : 0.6 + r() * 1.1, l: P.starLayers === 1 ? 0 : Math.floor(r() * 3), a: 0.35 + r() * 0.65, p: r() * 6.28, v: 0.6 + r() * 2.2, th: r() * 0.7, big };
    });
    far = ridge(r, 90, 1);
    mid = ridge(r, 80, 1.3);
    near = ridge(r, 70, 1.7);
    const crowns = (k: number, rmin: number, rmax: number): [number, number][] => {
      const out: [number, number][] = [];
      for (let x = -0.05; x < 1.08; x += k * (0.6 + r() * 0.8)) out.push([x, rmin + r() * (rmax - rmin)]);
      return out;
    };
    crownBack = crowns(0.035, 0.03, 0.06);
    crownFront = crowns(0.05, 0.05, 0.09);
    leaves = Array.from({ length: 18 }, (_, i) => ({ u: 0.12 + (i / 18) * 0.85, side: i % 2 ? 1 : -1, len: 10 + r() * 9, p: r() * 6.28 }));
  }

  function layout() {
    W = innerWidth;
    H = root.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, P.dprCap);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 相机在最后一段的底边对齐视口底边时就落到枝头；再往下滚是页脚，相机停着不动
    const last = sections[sections.length - 1];
    keys = buildKeys(sections.map((s) => ({ top: s.offsetTop, height: s.offsetHeight })), H, last.offsetTop + last.offsetHeight, LAYERS.map((l) => l.cam));
    for (const l of LAYERS) camOf[l.id] = l.cam * H;
    camCur = camAt(keys, scrollY);
  }

  /** 元素的屏幕 y；这一层不在 LAYERS 里就回 NaN（元素不画）。 */
  const placeY = (k: keyof typeof PLACE): number => {
    const [id, y0, f] = PLACE[k];
    const c = camOf[id];
    return c === undefined ? NaN : y0 * H - (camCur - c) * f;
  };

  // ── stars：星点、银河、流星、月亮 ───────────────────────────────────────

  function drawStars(p: number) {
    const w = weightAt(LAYERS, p, 'stars');
    if (w <= 0.01) return;
    const c = ctx!;
    // 银河：小图放大，旋转成一条斜带，几乎不动
    c.save();
    c.globalAlpha = w * 0.6;
    c.globalCompositeOperation = 'screen';
    c.imageSmoothingQuality = 'high';
    c.translate(W * 0.5 - mxs * 2, H * 0.45 - camCur * 0.03);
    const S = Math.max(W, H) * 1.5;
    c.drawImage(milky, -S / 2, -S / 2, S, S);
    c.restore();
    const span = H * 1.3, F = [0.03, 0.07, 0.13];
    c.fillStyle = '#fff';
    for (const s of stars) {
      const vis = clamp((w - s.th) / 0.3, 0, 1);
      if (vis <= 0) continue;
      let y = (s.y * span - camCur * F[s.l]) % span;
      if (y < 0) y += span;
      y -= (span - H) / 2;
      if (y < -4 || y > H + 4) continue;
      const x = s.x * W - mxs * (1 + s.l);
      const tw = P.animate ? 0.65 + 0.35 * Math.sin(t * s.v + s.p) : 0.85;
      const a = s.a * tw * vis;
      if (s.big) {
        c.globalAlpha = a * 0.8;
        c.drawImage(glow, x - 9, y - 9, 18, 18);
      }
      c.globalAlpha = a;
      c.fillRect(x - s.r / 2, y - s.r / 2, s.r, s.r);
    }
    c.globalAlpha = 1;
    if (P.meteors && w > 0.5) drawMeteors(w);
  }

  function drawMeteors(w: number) {
    const c = ctx!;
    if (t >= nextMeteor) {
      const a = 0.35 + Math.random() * 0.5, v = Math.max(W, H) * (0.9 + Math.random() * 0.5);
      meteors.push({ x: W * (0.25 + Math.random() * 0.7), y: H * (0.05 + Math.random() * 0.35), vx: -Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: 0.7 + Math.random() * 0.4 });
      nextMeteor = t + 8 + Math.random() * 7;
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      if (m.age > m.life) { meteors.splice(i, 1); continue; }
      const k = m.age / m.life, a = Math.sin(k * Math.PI) * w;
      const x = m.x + m.vx * m.age, y = m.y + m.vy * m.age, tail = 0.12;
      const g = c.createLinearGradient(x, y, x - m.vx * tail, y - m.vy * tail);
      g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g; c.lineWidth = 1.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - m.vx * tail, y - m.vy * tail); c.stroke();
    }
  }

  function drawMoon(p: number) {
    const a = weightAt(LAYERS, p, 'moon');
    const y = placeY('moon');
    if (a <= 0.01 || !(y > -200 && y < H + 200)) return;
    const c = ctx!, x = W * 0.78 - mxs * 3, r = Math.max(16, H * 0.028);
    const g = c.createRadialGradient(x, y, r * 0.6, x, y, r * 9);
    g.addColorStop(0, `rgba(220,226,255,${0.32 * a})`); g.addColorStop(1, 'rgba(220,226,255,0)');
    c.fillStyle = g; c.fillRect(x - r * 9, y - r * 9, r * 18, r * 18);
    c.fillStyle = `rgba(246,244,232,${a})`; c.beginPath(); c.arc(x, y, r, 0, 6.29); c.fill();
  }

  // ── clouds：云海、穿云 ──────────────────────────────────────────────────

  /** 横向平铺一条云：top 是屏幕 y，S 是贴图画到屏上的宽。 */
  function strip(pair: [HTMLCanvasElement, HTMLCanvasElement], top: number, S: number, dx: number, alpha: number, dawn: number, flip = false) {
    const c = ctx!, h = S / 4;
    if (top > H || top + h < 0 || alpha <= 0.01) return;
    const x0 = -(((dx % S) + S) % S);
    if (flip) { c.save(); c.translate(0, top * 2 + h); c.scale(1, -1); }
    for (const [img, a] of [[pair[0], 1 - dawn], [pair[1], dawn]] as const) {
      if (a <= 0.02) continue;
      c.globalAlpha = alpha * a;
      for (let x = x0; x < W; x += S) c.drawImage(img, x, top, S + 1, h);
    }
    if (flip) c.restore();
    c.globalAlpha = 1;
  }

  function drawClouds(p: number) {
    if (!decks.length || !wisp) return;
    const c = ctx!, top = placeY('deck');
    if (Number.isNaN(top)) return;
    const dawn = clamp(weightAt(LAYERS, p, 'dawn') * 1.4, 0, 1);
    const lit = mix(CLOUD_NIGHT[0], CLOUD_DAWN[0], dawn), shade = mix(CLOUD_NIGHT[1], CLOUD_DAWN[1], dawn);
    const drift = P.drift ? t : 0, S0 = Math.max(W, 900) * 1.1;
    const bottom = top + DECK * H;
    // 云海主体：顶上几排起伏的云头，下面实心
    if (bottom > 0 && top < H + S0) {
      const bodyTop = top + S0 * 0.11;
      if (bodyTop < H && bottom > 0) {
        const g = c.createLinearGradient(0, bodyTop, 0, bottom);
        const body = mix(toHex(lit), toHex(shade), 0.45), span = bottom - bodyTop;
        g.addColorStop(0, rgb(body, 0));
        g.addColorStop(Math.min(0.5, (H * 0.1) / span), rgb(body));
        g.addColorStop(1, rgb(shade));
        c.fillStyle = g;
        c.fillRect(0, Math.max(0, bodyTop), W, Math.min(H, bottom) - Math.max(0, bodyTop));
      }
      // 月光落在云顶
      const moon = weightAt(LAYERS, p, 'moon');
      if (moon > 0.05 && top > -H * 0.2 && top < H) {
        const gx = W * 0.78, gr = W * 0.5;
        const mg = c.createRadialGradient(gx, top, 0, gx, top, gr);
        mg.addColorStop(0, `rgba(230,234,255,${0.22 * moon})`); mg.addColorStop(1, 'rgba(230,234,255,0)');
        c.fillStyle = mg; c.fillRect(gx - gr, top - gr, gr * 2, gr * 2);
      }
      for (let k = 0; k < 4; k++) {
        const S = S0 * (0.55 + 0.3 * k);
        strip(decks[k % 3], top - S * 0.12 + k * H * 0.035, S, drift * (5 + 4 * k) + mxs * (3 + k) + k * 211, 1, dawn);
      }
      // 云底：出云以后头顶上那一层
      strip(wisp, bottom - S0 * 0.18, S0 * 1.2, drift * 7 + 97, 0.9, dawn, true);
    }
    // 满屏云雾 + 从镜头前掠过的两缕近云
    const fog = weightAt(LAYERS, p, 'fog');
    if (fog > 0.01) {
      c.fillStyle = rgb(mix(toHex(lit), toHex(shade), 0.3), fog * 0.78);
      c.fillRect(0, 0, W, H);
    }
    const wy = placeY('wisp');
    if (!Number.isNaN(wy)) {
      const S = S0 * 2.2;
      strip(wisp, wy - S * 0.125, S, drift * 18 + mxs * 6, 0.8, dawn);
      strip(wisp, wy + H * 0.5 - S * 0.125, S * 1.2, drift * 26 + 400 + mxs * 8, 0.7, dawn);
    }
  }

  // ── horizon：远山、晨光、林梢、晨雾、远处的小鸟 ─────────────────────────

  function range(pts: number[], base: number, amp: number, color: string, dx: number) {
    if (base - amp > H || Number.isNaN(base)) return;
    const c = ctx!, n = pts.length - 1;
    c.fillStyle = color; c.beginPath(); c.moveTo(-10 + dx, H + 10);
    for (let i = 0; i <= n; i++) c.lineTo(((W + 20) * i) / n - 10 + dx, base - pts[i] * amp);
    c.lineTo(W + 10 + dx, H + 10); c.closePath(); c.fill();
  }

  function crowns(list: [number, number][], base: number, color: string, dx: number) {
    if (Number.isNaN(base) || base - H * 0.1 > H) return;
    const c = ctx!;
    c.fillStyle = color; c.beginPath();
    for (const [x, r] of list) { const R = r * Math.max(W, 700); c.moveTo(x * W + dx + R, base); c.arc(x * W + dx, base, R, 0, 6.29); }
    c.fill();
    c.fillRect(0, base, W, H - base + 2);
  }

  function drawHorizon(p: number, sky: RGB[]) {
    const c = ctx!, dawn = weightAt(LAYERS, p, 'dawn');
    const fy = placeY('far');
    // 天边一线晨光
    if (dawn > 0.01 && !Number.isNaN(fy)) {
      const gy = fy - H * 0.06, gr = Math.max(W, H) * 0.7;
      const g = c.createRadialGradient(W * 0.62, gy, 0, W * 0.62, gy, gr);
      g.addColorStop(0, `rgba(255,190,130,${0.55 * dawn})`); g.addColorStop(0.35, `rgba(255,160,120,${0.18 * dawn})`); g.addColorStop(1, 'rgba(255,160,120,0)');
      c.fillStyle = g; c.fillRect(0, gy - gr, W, gr * 1.6);
    }
    const sk = toHex(sky[2]);
    range(far, fy, H * 0.1, rgb(mix(sk, '#2a2648', 0.42)), -mxs * 2);
    range(mid, placeY('mid'), H * 0.08, rgb(mix(sk, '#221d3a', 0.62)), -mxs * 3);
    range(near, placeY('near'), H * 0.07, rgb(mix(sk, '#1a1a2c', 0.8)), -mxs * 4);
    // 林梢
    const cb = placeY('crownBack'), cf = placeY('crownFront');
    // 逆光（晨光强）时树冠是深色剪影；天大亮以后隔着薄雾，颜色往天色上淡
    const k = 0.25 + 0.6 * dawn;
    crowns(crownBack, cb, rgb(mix(sk, '#2f4a3c', k)), -mxs * 5);
    drawMist(placeY('mist'), 0.45);
    crowns(crownFront, cf, rgb(mix(sk, '#1f3328', k + 0.15)), -mxs * 6);
    drawMist(cf - H * 0.02, 0.3);
    drawBirds(placeY('birds'));
  }

  function drawMist(y: number, a: number) {
    if (Number.isNaN(y) || y < -H * 0.2 || y > H + H * 0.1) return;
    const c = ctx!, h = H * 0.12, dx = P.drift ? Math.sin(t * 0.07) * W * 0.04 : 0;
    const g = c.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, 'rgba(240,244,248,0)'); g.addColorStop(0.5, `rgba(240,244,248,${a})`); g.addColorStop(1, 'rgba(240,244,248,0)');
    c.fillStyle = g;
    c.save(); c.translate(dx, 0); c.fillRect(-W * 0.1, y - h, W * 1.2, h * 2); c.restore();
  }

  /** 远处几只小鸟的剪影（不是长尾雀）。 */
  function drawBirds(y: number) {
    if (Number.isNaN(y) || y < -60 || y > H + 60 || tier === 'low') return;
    const c = ctx!;
    c.strokeStyle = 'rgba(30,40,52,.55)'; c.lineWidth = 1.3; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x = ((0.18 + i * 0.09 + (P.drift ? t * 0.006 : 0)) % 1.1) * W, yy = y + Math.sin(i * 2.1) * H * 0.04;
      const s = 5 + (i % 2) * 2, flap = P.animate ? Math.sin(t * 5 + i) * 2.4 : 1;
      c.beginPath(); c.moveTo(x - s, yy - flap); c.quadraticCurveTo(x - s * 0.4, yy - 1, x, yy + 1); c.quadraticCurveTo(x + s * 0.4, yy - 1, x + s, yy - flap); c.stroke();
    }
  }

  // ── branch：枝条与叶子 ──────────────────────────────────────────────────

  /** 枝条几何：从右边伸进来。回枝条上 u（0 = 屏外根部，1 = 梢）处的点。 */
  function branchAt(u: number, y0: number): [number, number] {
    const wide = W > 760;
    const x0 = W + 30, x1 = wide ? W * 0.56 : W * 0.34;
    const yA = y0 + H * 0.07, yB = y0;
    const x = lerp(x0, x1, u), y = lerp(yA, yB, u) - Math.sin(u * Math.PI) * H * 0.035;
    return [x, y];
  }

  /** 鸟落脚的点（屏幕坐标），给 Bird 组件对位用。 */
  let perch: [number, number] = [0, 0];

  function drawBranch() {
    const y0 = placeY(W > 760 ? 'branch' : 'branchNarrow');
    if (Number.isNaN(y0) || y0 < -H * 0.3 || y0 > H * 1.3) return;
    const c = ctx!, sway = P.animate && P.drift ? 1 : 0, k = clamp(W / 1100, 0.75, 1.5);
    // 主枝：沿中线画两条边，根部粗、梢细
    const N = 24, top: [number, number][] = [], bot: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, [x, y] = branchAt(u, y0), th = lerp(12, 1.6, u) * k;
      top.push([x, y - th / 2]); bot.push([x, y + th / 2]);
    }
    c.fillStyle = '#3b2a22'; c.beginPath(); c.moveTo(top[0][0], top[0][1]);
    for (const [x, y] of top) c.lineTo(x, y);
    for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    c.fill();
    // 一根小杈
    const [fx, fy] = branchAt(0.55, y0);
    c.strokeStyle = '#3b2a22'; c.lineWidth = 3 * k; c.lineCap = 'round';
    c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx - 20 * k, fy - 30 * k, fx - 46 * k, fy - 44 * k); c.stroke();
    // 叶子：两种绿，各自小相位轻晃
    for (const l of leaves) {
      const [x, y] = branchAt(l.u, y0), len = l.len * k;
      const a = l.side * (0.9 + Math.sin(t * 1.4 + l.p) * 0.12 * sway) + (l.side > 0 ? 0.25 : -0.25);
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = l.side > 0 ? '#4c7448' : '#6a9a5a';
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0); c.fill();
      c.restore();
    }
    perch = branchAt(0.72, y0);
  }

  function frame() {
    const p = progress(LAYERS, camCur / H);
    const c = ctx!, sky = skyAt(LAYERS, p);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(sky[0])); g.addColorStop(0.55, rgb(sky[1])); g.addColorStop(1, rgb(sky[2]));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const on = (d: Drawer) => drawerOn(LAYERS, p, d);
    if (on('stars')) { drawStars(p); drawMoon(p); }
    if (on('horizon')) drawHorizon(p, sky);
    if (on('clouds')) drawClouds(p);
    if (on('branch')) drawBranch();
  }

  // ── 刻度尺与浅深字 ──────────────────────────────────────────────────────

  let lastOn = -1;
  function hud() {
    const on = activeIndex(keys, scrollY);
    if (on === lastOn) return;
    lastOn = on;
    root.dataset.ink = LAYERS[on]?.ink ?? 'light';
    const r = opt.readout;
    if (!r) return;
    r.ticks.forEach((b, i) => b.toggleAttribute('aria-current', i === on));
    r.zone.textContent = r.names[on] ?? '';
  }

  // ── 循环 ────────────────────────────────────────────────────────────────

  const perfLog: number[] = [];
  if (opt.perf) (window as unknown as { __skyPerf: number[] }).__skyPerf = perfLog;

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
    const ms = performance.now() - t0;
    if (opt.perf) perfLog.push(ms);
    hud();
    // 前 30 帧量一下真实耗时：太慢就降一档（只降不升，免得来回抖）
    if (frames < 30) {
      slowSum += ms;
      if (++frames === 30) {
        const next = pickTier({ reducedMotion: false, cores: nav.hardwareConcurrency, memory: nav.deviceMemory, shortSide: Math.min(W, H), firstFrameMs: slowSum / 30 });
        const order: Tier[] = ['high', 'mid', 'low'];
        if (!opt.forceTier && order.indexOf(next) > order.indexOf(tier)) {
          tier = next; P = TIER_PARAMS[tier];
          root.dataset.skyTier = tier;
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
  let lastW = innerWidth, lastH = root.clientHeight;
  const onResize = () => {
    const w = innerWidth, h = root.clientHeight;
    if (w === lastW && Math.abs(h - lastH) < 120) return; // 手机地址栏伸缩不重排
    lastW = w; lastH = h;
    layout();
    if (!P.animate) still();
  };
  const onLoad = () => { layout(); if (!P.animate) still(); };

  build();
  buildClouds();
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

const toHex = (c: RGB): string => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

