// 启动时在客户端生成的贴图（方案 §3.2）：云用值噪声 fBm 预渲染到离屏 canvas，银河是一张小图放大糊开。
// 运行时只对它们做平移和透明度，所以每帧很便宜；不下载任何图片。

export type Rand = () => number;

/** 固定种子的伪随机（mulberry32），每次打开画面一样。 */
export function rng(seed: number): Rand {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** 一条 0..1 的起伏轮廓（山脊）：几组正弦叠加，rough 越大越碎。 */
export function ridge(r: Rand, n: number, rough: number): number[] {
  const p = [r() * 6, r() * 6, r() * 6, r() * 6];
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = Math.sin(u * 5 + p[0]) * 0.45 + Math.sin(u * 13 + p[1]) * 0.3 + Math.sin(u * 29 + p[2]) * 0.17 * rough + Math.sin(u * 61 + p[3]) * 0.08 * rough;
    out.push(0.5 + v * 0.55);
  }
  return out;
}

/**
 * w×h 的 fBm 值噪声，横向首尾相接（贴图可以无缝平铺）。回 0..1。
 * cells：最低一层横向的格数；octaves：叠几层。
 */
export function fbm(r: Rand, w: number, h: number, cells: number, octaves: number): Float32Array {
  const out = new Float32Array(w * h);
  let amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const cx = cells << o, cy = Math.ceil((cx * h) / w) + 1;
    const g = new Float32Array(cx * (cy + 1));
    for (let i = 0; i < g.length; i++) g[i] = r();
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * (cy - 1), iy = fy | 0, ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * cx, ix = fx | 0, tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
        const x0 = ix % cx, x1 = (ix + 1) % cx;
        const a = g[iy * cx + x0], b = g[iy * cx + x1], c = g[(iy + 1) * cx + x0], d = g[(iy + 1) * cx + x1];
        out[y * w + x] += (a + (b - a) * sx + (c - a + (a - b + d - c) * sx) * sy) * amp;
      }
    }
    norm += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

type RGB = [number, number, number];

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** 云的形状：deck = 云海顶（下半实、上沿起伏），wisp = 一缕横云（中间浓、上下淡）。 */
export type CloudShape = { kind: 'deck'; cover: number } | { kind: 'wisp' };

/** 噪声 → 密度（0..1）。纯函数，方便单测之外也能复用。 */
function density(n: number, v: number, s: CloudShape): number {
  if (s.kind === 'deck') return Math.min(1, Math.max(0, (n * 1.25 + v * 1.05 - 1.02 - s.cover) * 3.2));
  return Math.min(1, Math.max(0, (n - Math.abs(v - 0.5) * 1.5 - 0.16) * 2.4));
}

/**
 * 一组同形状、两种光色的云贴图：同一份噪声，分别按「月光」和「晨光」上色。
 * 上色带一点顶光：越靠上、噪声越高的地方越亮。
 */
export function cloudPair(r: Rand, w: number, h: number, shape: CloudShape, night: [RGB, RGB], dawn: [RGB, RGB]): [HTMLCanvasElement, HTMLCanvasElement] {
  const n = fbm(r, w, h, 4, 5);
  return [night, dawn].map(([lit, shade]) => {
    const [c, x] = canvas(w, h);
    const img = x.createImageData(w, h), px = img.data;
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let i = 0; i < w; i++) {
        const k = y * w + i, d = density(n[k], v, shape);
        if (d <= 0) continue;
        const light = Math.min(1, Math.max(0, 1.05 - v * 0.75 + (n[k] - 0.5) * 0.6));
        const o = k * 4;
        px[o] = shade[0] + (lit[0] - shade[0]) * light;
        px[o + 1] = shade[1] + (lit[1] - shade[1]) * light;
        px[o + 2] = shade[2] + (lit[2] - shade[2]) * light;
        px[o + 3] = d * 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }) as [HTMLCanvasElement, HTMLCanvasElement];
}

/**
 * 银河：一张小图，沿对角撒一串柔光团、压一条暗尘带；画到屏上时放大好几倍，自然就糊成一条光带。
 * 逐像素自己算（不用 canvas 渐变）：canvas 渐变带抖动，放大后会露出格子纹。底是不透明的黑，用 screen 叠到天上。
 */
export function milkyWay(r: Rand): HTMLCanvasElement {
  const S = 256, k = S / 160;
  const blobs = Array.from({ length: 70 }, () => {
    const u = r(), off = (r() - 0.5) * (r() - 0.5) * 70 * k;
    const warm = r() < 0.3;
    return { x: u * S + off * 0.7, y: S - u * S + off * 0.7, r: (6 + r() * 18) * k, c: warm ? [255, 214, 190, 0.16] : [190, 200, 255, 0.14] };
  });
  const dust = Array.from({ length: 26 }, () => {
    const u = 0.15 + r() * 0.7;
    return { x: u * S + (r() - 0.5) * 8 * k, y: S - u * S + (r() - 0.5) * 8 * k, r: (3 + r() * 6) * k };
  });
  const [c, x] = canvas(S, S);
  const img = x.createImageData(S, S), px = img.data;
  // 衰减用 (1 − d²/r²)²：和高斯差不多软，比 exp 便宜，到 r 处正好归零
  const fall = (dx: number, dy: number, rad: number) => {
    const q = 1 - (dx * dx + dy * dy) / (rad * rad);
    return q > 0 ? q * q : 0;
  };
  for (let y = 0; y < S; y++) {
    for (let i = 0; i < S; i++) {
      let R = 0, G = 0, B = 0, shade = 1;
      for (const b of blobs) {
        const f = fall(i - b.x, y - b.y, b.r) * b.c[3];
        if (f) { R += b.c[0] * f; G += b.c[1] * f; B += b.c[2] * f; }
      }
      if (!R) continue;
      for (const d of dust) shade *= 1 - fall(i - d.x, y - d.y, d.r) * 0.45;
      const o = (y * S + i) * 4;
      px[o] = R * shade; px[o + 1] = G * shade; px[o + 2] = B * shade;
    }
  }
  for (let o = 3; o < px.length; o += 4) px[o] = 255;
  x.putImageData(img, 0, 0);
  return c;
}

/** 亮星的光晕小图（每颗亮星 drawImage 一次，比每帧建渐变便宜）。 */
export function glowSprite(): HTMLCanvasElement {
  const [c, x] = canvas(32, 32);
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,.9)');
  g.addColorStop(0.15, 'rgba(220,228,255,.45)');
  g.addColorStop(1, 'rgba(220,228,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  return c;
}
