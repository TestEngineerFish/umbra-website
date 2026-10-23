// 设备分档：决定首页天空开多少东西（方案 §3.3）。纯函数，测试见 tests/tier.test.ts。
//
// - high：星点满量、WebGL 云、鼠标视差、流星，DPR 到 1.75
// - mid：星点减半、贴图云、流星，DPR 1.25
// - low：只剩一层星点、贴图云不飘、没有流星，DPR 1
// - static：系统设了「减少动态效果」—— 不跑动画循环，只在滚动时重画一帧；星星不闪，没有流星

export type Tier = 'high' | 'mid' | 'low' | 'static';

export interface DeviceHints {
  reducedMotion: boolean;
  /** navigator.hardwareConcurrency，拿不到给 undefined */
  cores?: number;
  /** navigator.deviceMemory（GB，只有 Chromium 给），拿不到给 undefined */
  memory?: number;
  /** 视口短边 px */
  shortSide: number;
  /** 首帧实测耗时 ms（可选：跑一帧后再降档） */
  firstFrameMs?: number;
}

export function pickTier(h: DeviceHints): Tier {
  if (h.reducedMotion) return 'static';
  const cores = h.cores ?? 8;
  const memory = h.memory ?? 8;
  if (h.firstFrameMs !== undefined && h.firstFrameMs > 40) return 'low';
  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4 || h.shortSide < 520) return 'mid';
  if (h.firstFrameMs !== undefined && h.firstFrameMs > 20) return 'mid';
  return 'high';
}

/** 各档的具体参数。 */
export interface TierParams {
  dprCap: number;
  /** 星点数量系数（相对满量） */
  stars: number;
  /** 星点视差层数：1 或 3 */
  starLayers: number;
  /** 云：gl = WebGL（失败当场回落 tex），tex = 预渲染贴图 */
  clouds: 'gl' | 'tex';
  /** 云、雾、叶子随时间飘动 */
  drift: boolean;
  meteors: boolean;
  parallax: boolean;
  animate: boolean;
}

export const TIER_PARAMS: Record<Tier, TierParams> = {
  high: { dprCap: 1.75, stars: 1, starLayers: 3, clouds: 'gl', drift: true, meteors: true, parallax: true, animate: true },
  mid: { dprCap: 1.25, stars: 0.5, starLayers: 3, clouds: 'tex', drift: true, meteors: true, parallax: false, animate: true },
  low: { dprCap: 1, stars: 0.5, starLayers: 1, clouds: 'tex', drift: false, meteors: false, parallax: false, animate: true },
  static: { dprCap: 1.25, stars: 0.5, starLayers: 3, clouds: 'tex', drift: false, meteors: false, parallax: false, animate: false },
};
