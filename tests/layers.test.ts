import { describe, expect, it } from 'vitest';
import { drawerOn, hex, LAYERS, mix, progress, skyAt, weightAt, type Layer } from '../src/scripts/sky/layers';
import { zh } from '../src/i18n/zh';

/** 造一张 n 层的表：模拟以后加段 / 减段。 */
const fake = (n: number): Layer[] =>
  Array.from({ length: n }, (_, i) => ({
    ...LAYERS[Math.min(i, LAYERS.length - 1)],
    id: `l${i}`,
    cam: i * 1.1,
  }));

describe('LAYERS 表', () => {
  it('和首页各段一一对上（段数只由这张表决定）', () => {
    expect(LAYERS.map((l) => l.id)).toEqual(zh.home.sections.map((s) => s.id));
  });
  it('id 不重复，相机位置严格递增', () => {
    expect(new Set(LAYERS.map((l) => l.id)).size).toBe(LAYERS.length);
    for (let i = 1; i < LAYERS.length; i++) expect(LAYERS[i].cam).toBeGreaterThan(LAYERS[i - 1].cam);
  });
  it('天色都是 #rrggbb', () => {
    for (const l of LAYERS) for (const c of l.sky) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('第一层是星空、最后一层是枝头', () => {
    expect(LAYERS[0].draw).toContain('stars');
    expect(LAYERS[LAYERS.length - 1].draw).toContain('branch');
  });
});

describe('progress', () => {
  it('落在某层上时 p 正好是该层下标', () => {
    LAYERS.forEach((l, i) => expect(progress(LAYERS, l.cam)).toBeCloseTo(i));
  });
  it('越界夹住', () => {
    expect(progress(LAYERS, -3)).toBe(0);
    expect(progress(LAYERS, 99)).toBe(LAYERS.length - 1);
  });
  it('随相机单调不减', () => {
    let prev = -1;
    for (let c = -1; c < 9; c += 0.05) {
      const p = progress(LAYERS, c);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
  it('段数改了不报错：1、3、12 层都能算', () => {
    for (const n of [1, 3, 12]) {
      const L = fake(n);
      for (let c = -1; c < n * 1.2; c += 0.3) {
        const p = progress(L, c);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(n - 1);
        expect(skyAt(L, p)).toHaveLength(3);
        expect(Number.isFinite(weightAt(L, p, 'stars'))).toBe(true);
      }
    }
  });
  it('空表抛错', () => expect(() => progress([], 0)).toThrow());
});

describe('天色过渡', () => {
  it('落在某层上时正好是该层的色', () => {
    LAYERS.forEach((l, i) => {
      const s = skyAt(LAYERS, i);
      l.sky.forEach((c, k) => expect(s[k]).toEqual(hex(c)));
    });
  });
  it('相邻两层之间每个色道单调过渡，不绕路', () => {
    for (let i = 0; i < LAYERS.length - 1; i++) {
      for (let k = 0; k < 3; k++) {
        const a = hex(LAYERS[i].sky[k]), b = hex(LAYERS[i + 1].sky[k]);
        let prev = skyAt(LAYERS, i)[k];
        for (let u = 0.05; u <= 1.0001; u += 0.05) {
          const cur = skyAt(LAYERS, i + u)[k];
          for (let ch = 0; ch < 3; ch++) {
            const dir = Math.sign(b[ch] - a[ch]);
            expect((cur[ch] - prev[ch]) * dir).toBeGreaterThanOrEqual(0);
          }
          prev = cur;
        }
      }
    }
  });
  it('mix 两端', () => {
    expect(mix('#000000', '#ffffff', 0)).toEqual([0, 0, 0]);
    expect(mix('#000000', '#ffffff', 1)).toEqual([255, 255, 255]);
  });
});

describe('权重与绘制器', () => {
  it('星空一路淡出：越往下越少', () => {
    let prev = Infinity;
    for (let p = 0; p <= LAYERS.length - 1; p += 0.1) {
      const w = weightAt(LAYERS, p, 'stars');
      expect(w).toBeLessThanOrEqual(prev + 1e-9);
      prev = w;
    }
  });
  it('过渡途中开相邻两层的并集', () => {
    const i = LAYERS.findIndex((l) => l.id === 'treetops');
    expect(drawerOn(LAYERS, i, 'branch')).toBe(false);
    expect(drawerOn(LAYERS, i + 0.5, 'branch')).toBe(true);
  });
});
