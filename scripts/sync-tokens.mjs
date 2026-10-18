// 从设计包的 umbra-tokens.json 生成 src/styles/tokens.css —— 官网和三端客户端用同一份颜色。
// 用法：node scripts/sync-tokens.mjs [tokens.json 路径]；缺省读 ../doc/Umbra_design/umbra-tokens.json。
// 生成物进仓（构建不依赖 doc 仓在不在）；设计包升版后重跑一次再提交。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, process.argv[2] || '../../doc/Umbra_design/umbra-tokens.json');
const out = resolve(here, '../src/styles/tokens.css');
const tokens = JSON.parse(readFileSync(src, 'utf8'));

/** camelCase → kebab-case（orangeSoft → orange-soft）。 */
const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()).replace(/(\D)(\d)/g, '$1-$2');

/** 一套主题的变量块；只收字符串值（色值），跳过说明性对象。 */
function block(theme) {
  return Object.entries(tokens.color[theme])
    .filter(([, v]) => typeof v === 'string')
    .map(([k, v]) => `  --${kebab(k)}: ${v};`)
    .join('\n');
}

const css = `/* 由 scripts/sync-tokens.mjs 从 umbra-tokens.json v${tokens.version}（${tokens.updated}）生成，别手改。 */
:root {
${block('light')}
  --font-sans: ${tokens.font.sans};
  --font-mono: ${tokens.font.mono};
  --radius-sm: ${tokens.radius.sm}px;
  --radius-md: ${tokens.radius.md}px;
  --radius-lg: ${tokens.radius.lg}px;
  --radius-xl: ${tokens.radius.xl}px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block('dark').replace(/^/gm, '  ')}
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${block('dark')}
  color-scheme: dark;
}
`;
writeFileSync(out, css);
console.log(`tokens.css ← ${src}（v${tokens.version}）`);
