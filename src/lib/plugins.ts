// 插件页的数据：构建时从服务端公开接口取（GET /plugins/catalog，不要凭证），取不到用离线清单。
// normalize 是纯函数，测试见 tests/plugins.test.ts。

export interface PluginEntry {
  id: string;
  name: string;
  author: string;
  version: string;
  price: number;
  builtin: boolean;
  brief: string;
  formats: string[];
  updated: string;
}

export interface ThemeEntry {
  id: string;
  name: string;
  author: string;
  price: number;
  brief: string;
  /** 浅 / 深各一组 bg / card / accent（服务端 THEME_CATALOG_FIELDS 的 preview） */
  preview: { light?: Swatch; dark?: Swatch };
}

export interface Swatch {
  bg?: string;
  card?: string;
  accent?: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
/** 只放行 #rgb / #rrggbb / #rrggbbaa —— 色值要进 style 属性，别的一律丢掉。 */
const color = (v: unknown): string | undefined => (typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ? v : undefined);

function swatch(v: unknown): Swatch | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  return { bg: color(o.bg), card: color(o.card), accent: color(o.accent) };
}

/** 服务端回包 → 页面用的形状；缺字段给缺省，没 id 或没名字的条目丢掉。 */
export function normalizePlugins(raw: unknown): PluginEntry[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { plugins?: unknown }).plugins) ? (raw as { plugins: unknown[] }).plugins : [];
  return list.flatMap((x) => {
    if (!x || typeof x !== 'object') return [];
    const o = x as Record<string, unknown>;
    const id = str(o.id), name = str(o.name);
    if (!id || !name) return [];
    return [{
      id, name,
      author: str(o.author) || 'Umbra',
      version: str(o.version),
      price: num(o.price),
      builtin: o.builtin === true || o.builtin === 1,
      brief: str(o.brief),
      formats: Array.isArray(o.formats) ? o.formats.filter((f): f is string => typeof f === 'string') : [],
      updated: str(o.updated),
    }];
  });
}

export function normalizeThemes(raw: unknown): ThemeEntry[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { plugins?: unknown }).plugins) ? (raw as { plugins: unknown[] }).plugins : [];
  return list.flatMap((x) => {
    if (!x || typeof x !== 'object') return [];
    const o = x as Record<string, unknown>;
    const id = str(o.id), name = str(o.name);
    if (!id || !name) return [];
    const p = (o.preview && typeof o.preview === 'object' ? o.preview : {}) as Record<string, unknown>;
    return [{ id, name, author: str(o.author) || 'Umbra', price: num(o.price), brief: str(o.brief), preview: { light: swatch(p.light), dark: swatch(p.dark) } }];
  });
}

/** 带超时的取数；任何失败（网络、超时、非 2xx、不是 JSON）都回 null。 */
export async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
