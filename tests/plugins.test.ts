import { describe, expect, it } from 'vitest';
import { normalizePlugins, normalizeThemes } from '../src/lib/plugins';
import snapshot from '../src/data/plugins-snapshot.json';
import { brand } from '../src/brand';

describe('normalizePlugins', () => {
  it('离线清单三条内置插件都能读出来', () => {
    const list = normalizePlugins(snapshot);
    expect(list.map((x) => x.id)).toEqual(['com.umbra.markdown', 'com.umbra.code', 'com.umbra.html']);
    expect(list.every((x) => x.builtin)).toBe(true);
    // 离线清单里官方作者写的是内部代号，页面上要显示对外品牌名
    expect(list.every((x) => x.author === brand.productName)).toBe(true);
  });
  it('服务端回 builtin=1、缺字段也不炸', () => {
    const [p] = normalizePlugins({ plugins: [{ id: 'a', name: 'A', builtin: 1 }] });
    expect(p).toMatchObject({ id: 'a', name: 'A', builtin: true, author: brand.productName, price: 0, formats: [] });
  });
  it('没 id / 没名字 / 负价格 / 非对象被处理掉', () => {
    const list = normalizePlugins({ plugins: [{ id: '', name: 'x' }, { id: 'b' }, null, 3, { id: 'c', name: 'C', price: -5 }] });
    expect(list).toHaveLength(1);
    expect(list[0].price).toBe(0);
  });
  it('不是预期形状 → 空列表', () => {
    expect(normalizePlugins(null)).toEqual([]);
    expect(normalizePlugins({ plugins: 'x' })).toEqual([]);
  });
});

describe('normalizeThemes', () => {
  it('色值只放行十六进制，其余丢掉（它们要进 style 属性）', () => {
    const [t] = normalizeThemes({ plugins: [{ id: 't', name: 'T', preview: { light: { bg: '#fff', card: 'red;background:url(x)', accent: '#E8590C' } } }] });
    expect(t.preview.light).toEqual({ bg: '#fff', card: undefined, accent: '#E8590C' });
    expect(t.preview.dark).toBeUndefined();
  });
});
