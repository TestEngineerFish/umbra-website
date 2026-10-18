// 构建产物检查（npm run verify 的第二步）：
// 1. 每个页面里的站内链接都指向存在的页面 / 文件（#锚点也要在目标页里找得到）
// 2. 性能预算（草案 §4.3）：首页 JS gzip < 150 KB；单张截图 < 300 KB
// 3. 页面不能加载外部资源（src 指向外站、境外字体 / 统计 / CDN）—— 国内访问要稳
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(dist);
const pages = files.filter((f) => f.endsWith('.html'));
const errors = [];

const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const resolvePage = (url) => {
  const p = url.split('#')[0].split('?')[0];
  const cands = p.endsWith('/') ? [join(dist, p, 'index.html')] : [join(dist, p), join(dist, p, 'index.html')];
  return cands.find((c) => existsSync(c) && statSync(c).isFile());
};

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const self = '/' + relative(dist, dirname(page)).replace(/\\/g, '/') + '/';
  for (const [, attr, url] of html.matchAll(/(href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(url)) {
      // 外链（href）放行；外部加载的资源（src）一律不许 —— 国内访问要稳，也不给第三方递访客信息
      if (attr === 'src' && /^https?:/.test(url)) errors.push(`${self}: 外部资源 ${url}`);
      continue;
    }
    const abs = url.startsWith('#') ? self + url : url;
    const target = resolvePage(abs);
    if (!target) { errors.push(`${self}: 坏链接 ${url}`); continue; }
    const hash = abs.split('#')[1];
    if (hash && target.endsWith('.html') && !idsOf(readFileSync(target, 'utf8')).has(hash)) errors.push(`${self}: 锚点不存在 ${url}`);
  }
  if (/fonts\.googleapis|googletagmanager|google-analytics|cdn\.jsdelivr|unpkg\.com/.test(html)) errors.push(`${self}: 引了境外资源`);
}

// 首页 JS 预算：首页引用的全部 script 合计 gzip
const home = readFileSync(join(dist, 'index.html'), 'utf8');
const scripts = [...home.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
let js = 0;
for (const s of scripts) js += gzipSync(readFileSync(join(dist, s))).length;
for (const [, inline] of home.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) js += gzipSync(inline).length;
if (js > 150 * 1024) errors.push(`首页 JS ${(js / 1024).toFixed(1)} KB gzip，超过 150 KB 预算`);

for (const f of files.filter((f) => f.includes('/shots/'))) {
  const kb = statSync(f).size / 1024;
  if (kb > 300) errors.push(`截图过大 ${relative(dist, f)} ${kb.toFixed(0)} KB`);
}

const total = files.reduce((n, f) => n + statSync(f).size, 0);
console.log(`页面 ${pages.length} 个 · 首页 JS ${(js / 1024).toFixed(1)} KB gzip · 产物合计 ${(total / 1024).toFixed(0)} KB`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('check-dist 通过');
