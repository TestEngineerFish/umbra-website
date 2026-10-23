// 首页场景的「相机」：滚动位置 → 相机在世界里的位置。纯函数，不碰 DOM，测试见 tests/camera.test.ts。
//
// 每一段内容居中时，相机停在那一段预先设好的深度（关键帧）；两段之间用 smoothstep 过渡。
// 于是背景只在段与段之间移动，读某一段时基本不动 ——「一段一停」，滚快了文案也看得清。

/** 一个关键帧：滚到 `scroll` 时相机在 `cam`（世界坐标 px）。 */
export interface Key {
  scroll: number;
  cam: number;
}

/** smoothstep：两端导数为 0，段首段尾都是「停住」的手感。 */
export const ease = (u: number): number => u * u * (3 - 2 * u);

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

/**
 * 由各段的版面位置算关键帧。
 * - `sections`：每段的 `top` / `height`（px，相对文档）
 * - `camK`：每段居中时相机位置，单位「屏高」
 * 第一段钉在 scroll=0、最后一段钉在可滚动的最大值，保证首尾一定到得了。
 */
export function buildKeys(
  sections: { top: number; height: number }[],
  viewport: number,
  docHeight: number,
  camK: number[],
): Key[] {
  if (sections.length < 2) throw new Error('至少要两段');
  if (camK.length !== sections.length) throw new Error('关键帧数和段数对不上');
  const max = Math.max(0, docHeight - viewport);
  const keys = sections.map((s, i) => ({
    scroll: clamp(s.top + s.height / 2 - viewport / 2, 0, max),
    cam: camK[i] * viewport,
  }));
  keys[0].scroll = 0;
  keys[keys.length - 1].scroll = max;
  // 段很矮时居中位置可能倒序，强制单调，避免插值分母为负。
  for (let i = 1; i < keys.length; i++) keys[i].scroll = Math.max(keys[i].scroll, keys[i - 1].scroll);
  return keys;
}

/** 滚动位置落在哪一段之间：回 `[i, u]`，`u` ∈ [0,1] 是 i → i+1 的进度。 */
export function segment(keys: Key[], y: number): [number, number] {
  for (let i = 0; i < keys.length - 1; i++) {
    if (y <= keys[i + 1].scroll) {
      const span = keys[i + 1].scroll - keys[i].scroll;
      return [i, span <= 0 ? 1 : clamp((y - keys[i].scroll) / span, 0, 1)];
    }
  }
  return [keys.length - 2, 1];
}

/** 相机位置（px）。 */
export function camAt(keys: Key[], y: number): number {
  const [i, u] = segment(keys, y);
  return lerp(keys[i].cam, keys[i + 1].cam, ease(u));
}

/** 当前高亮哪一段：过了一半就算下一段。 */
export function activeIndex(keys: Key[], y: number): number {
  const [i, u] = segment(keys, y);
  return u > 0.5 ? i + 1 : i;
}
