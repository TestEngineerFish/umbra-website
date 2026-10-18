import { describe, expect, it } from 'vitest';
import { activeIndex, buildKeys, camAt, depthAt, ease, formatDepth, segment } from '../src/scripts/ocean/camera';

// 七段，每段一屏高（800），文档 = 7 屏
const V = 800;
const secs = Array.from({ length: 7 }, (_, i) => ({ top: i * V, height: V }));
const CAM = [0, 0.16, 1.7, 3.2, 4.7, 6.2, 7.35];
const DEP = [0, 5, 30, 200, 1000, 4000, 4800];
const keys = buildKeys(secs, V, 7 * V, CAM, DEP);

describe('buildKeys', () => {
  it('首段钉 0、末段钉最大可滚动值', () => {
    expect(keys[0].scroll).toBe(0);
    expect(keys[6].scroll).toBe(6 * V);
  });
  it('段居中时的滚动位置 = top + h/2 − V/2', () => {
    expect(keys[3].scroll).toBe(3 * V);
  });
  it('相机深度按屏高换算', () => {
    expect(keys[2].cam).toBeCloseTo(1.7 * V);
  });
  it('段太矮时滚动位置仍单调不减', () => {
    const k = buildKeys([{ top: 0, height: 100 }, { top: 100, height: 50 }, { top: 150, height: 50 }], V, 900, [0, 1, 2], [0, 1, 2]);
    for (let i = 1; i < k.length; i++) expect(k[i].scroll).toBeGreaterThanOrEqual(k[i - 1].scroll);
  });
  it('段数与关键帧数对不上就抛错', () => {
    expect(() => buildKeys(secs, V, 7 * V, [0, 1], DEP)).toThrow();
  });
});

describe('camAt / depthAt', () => {
  it('段居中时正好停在该段的关键帧', () => {
    for (let i = 0; i < 7; i++) {
      expect(camAt(keys, keys[i].scroll)).toBeCloseTo(keys[i].cam);
      expect(depthAt(keys, keys[i].scroll)).toBeCloseTo(DEP[i]);
    }
  });
  it('段中点走过一半（smoothstep 对称）', () => {
    const mid = (keys[2].scroll + keys[3].scroll) / 2;
    expect(camAt(keys, mid)).toBeCloseTo((keys[2].cam + keys[3].cam) / 2);
  });
  it('滚动越界被夹住', () => {
    expect(camAt(keys, -500)).toBe(0);
    expect(camAt(keys, 99999)).toBeCloseTo(keys[6].cam);
  });
  it('深度随滚动单调不减', () => {
    let prev = -1;
    for (let y = 0; y <= 6 * V; y += 37) {
      const d = depthAt(keys, y);
      expect(d).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = d;
    }
  });
});

describe('segment / activeIndex', () => {
  it('过半算下一段', () => {
    expect(activeIndex(keys, keys[1].scroll + V * 0.4)).toBe(1);
    expect(activeIndex(keys, keys[1].scroll + V * 0.6)).toBe(2);
  });
  it('两关键帧重合时进度直接为 1（不除零）', () => {
    const k = [{ scroll: 0, cam: 0, depth: 0 }, { scroll: 0, cam: 10, depth: 5 }];
    expect(segment(k, 0)).toEqual([0, 1]);
  });
});

describe('ease / formatDepth', () => {
  it('smoothstep 端点与中点', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBe(0.5);
  });
  it('读数格式', () => {
    expect(formatDepth(0)).toBe('0 m');
    expect(formatDepth(0.4)).toBe('0 m');
    expect(formatDepth(1000)).toBe('−1,000 m');
    expect(formatDepth(4799.6)).toBe('−4,800 m');
  });
});
