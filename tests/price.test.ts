import { describe, expect, it } from 'vitest';
import { bytesLabel, discountLabel, perMonthOfYear, yearSaving, yuan } from '../src/lib/price';

describe('price', () => {
  it('分 → 元', () => {
    expect(yuan(1500)).toBe('¥15');
    expect(yuan(14800)).toBe('¥148');
    expect(yuan(1233)).toBe('¥12.33');
    expect(yuan(1230)).toBe('¥12.3');
  });
  it('年付折合每月与省下的钱（服务端初值：月 15、年 148）', () => {
    expect(yuan(perMonthOfYear(14800))).toBe('¥12.33');
    expect(yuan(yearSaving(1500, 14800))).toBe('¥32');
    expect(yearSaving(1000, 20000)).toBe(0);
  });
  it('折扣', () => {
    expect(discountLabel(95)).toBe('95 折');
    expect(discountLabel(90)).toBe('9 折');
    expect(discountLabel(100)).toBe('不打折');
  });
  it('容量', () => {
    expect(bytesLabel(100 * 1024 ** 2)).toBe('100 MB');
    expect(bytesLabel(1024 ** 3)).toBe('1 GB');
    expect(bytesLabel(1536 * 1024 ** 2)).toBe('1.5 GB');
  });
});
