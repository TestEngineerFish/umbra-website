// 产品截图：放在 public/shots/<名字>.webp（或 .png）。构建时查文件在不在，不在就画占位框，不会出坏图。
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../public/shots/', import.meta.url));

/** 回可用的地址（/shots/x.webp），没有回 null。 */
export function shotUrl(name: string): string | null {
  for (const ext of ['webp', 'png', 'jpg']) {
    if (existsSync(root + `${name}.${ext}`)) return `/shots/${name}.${ext}`;
  }
  return null;
}
