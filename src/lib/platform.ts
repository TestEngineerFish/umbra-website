// 下载页识别访客系统，把对应那张卡排第一并高亮。纯函数，测试见 tests/platform.test.ts。

export type Platform = 'mac' | 'win' | 'ios' | 'android' | 'other';

/**
 * - iPadOS 13+ 的 Safari 默认报桌面 UA（Macintosh），靠 `maxTouchPoints > 1` 认回 iOS。
 * - 认不出来回 `other`，页面就按默认顺序排、不高亮。
 */
export function detectPlatform(ua: string, maxTouchPoints = 0): Platform {
  const s = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return 'ios';
  if (s.includes('macintosh') && maxTouchPoints > 1) return 'ios';
  if (s.includes('android')) return 'android';
  if (s.includes('windows')) return 'win';
  if (s.includes('mac os x') || s.includes('macintosh')) return 'mac';
  return 'other';
}
