import { describe, expect, it } from 'vitest';
import { pickTier, TIER_PARAMS } from '../src/scripts/ocean/tier';

const base = { reducedMotion: false, cores: 8, memory: 8, shortSide: 900 };

describe('pickTier', () => {
  it('减少动态效果优先于一切', () => expect(pickTier({ ...base, reducedMotion: true, cores: 16 })).toBe('static'));
  it('好机器全开', () => expect(pickTier(base)).toBe('high'));
  it('拿不到硬件信息按好机器算（Safari 不给 deviceMemory）', () => expect(pickTier({ reducedMotion: false, shortSide: 900 })).toBe('high'));
  it('4 核或小屏降到 mid', () => {
    expect(pickTier({ ...base, cores: 4 })).toBe('mid');
    expect(pickTier({ ...base, shortSide: 390 })).toBe('mid');
  });
  it('2 核或 2GB 内存降到 low', () => {
    expect(pickTier({ ...base, cores: 2 })).toBe('low');
    expect(pickTier({ ...base, memory: 2 })).toBe('low');
  });
  it('首帧实测：>20ms mid，>40ms low', () => {
    expect(pickTier({ ...base, firstFrameMs: 8 })).toBe('high');
    expect(pickTier({ ...base, firstFrameMs: 25 })).toBe('mid');
    expect(pickTier({ ...base, firstFrameMs: 45 })).toBe('low');
  });
  it('static 档不跑动画循环，low 档不画粒子与鱼', () => {
    expect(TIER_PARAMS.static.animate).toBe(false);
    expect(TIER_PARAMS.low.snow).toBe(0);
    expect(TIER_PARAMS.low.fish).toBe(0);
  });
});
