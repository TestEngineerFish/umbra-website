// 设备分档：决定首页场景开多少东西。纯函数，测试见 tests/tier.test.ts。
//
// - high：全开（粒子满量、DPR 到 1.75、鼠标视差）
// - mid：粒子减半、DPR 1.25
// - low：只剩分层视差与颜色过渡，不画鱼群与粒子
// - static：系统设了「减少动态效果」—— 不跑动画循环，只在滚动时重画一帧

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
  snow: number;
  glitter: number;
  fish: number;
  parallax: boolean;
  animate: boolean;
}

export const TIER_PARAMS: Record<Tier, TierParams> = {
  high: { dprCap: 1.75, snow: 150, glitter: 140, fish: 46, parallax: true, animate: true },
  mid: { dprCap: 1.25, snow: 70, glitter: 70, fish: 24, parallax: true, animate: true },
  low: { dprCap: 1, snow: 0, glitter: 40, fish: 0, parallax: false, animate: true },
  static: { dprCap: 1.25, snow: 60, glitter: 60, fish: 24, parallax: false, animate: false },
};
