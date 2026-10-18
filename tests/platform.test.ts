import { describe, expect, it } from 'vitest';
import { detectPlatform } from '../src/lib/platform';

describe('detectPlatform', () => {
  it('Mac Safari / Chrome', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15')).toBe('mac');
  });
  it('iPadOS 报桌面 UA，靠触点数认回 iOS', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5)).toBe('ios');
  });
  it('iPhone', () => expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios'));
  it('Android（UA 里也带 Linux）', () => expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('android'));
  it('Windows', () => expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('win'));
  it('认不出来', () => expect(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('other'));
});
