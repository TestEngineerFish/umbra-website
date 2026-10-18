// @ts-check
import { defineConfig } from 'astro/config';

// 站点地址：正式域名未定（W2），先由环境变量给；不给就用占位，只影响 canonical / OG / sitemap 里的绝对地址。
const site = process.env.SITE_URL || 'https://www.tingyusha.xyz';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  // 国内访问：不引任何境外字体 / 统计 / CDN，全部随站点走 OSS + CDN。
  devToolbar: { enabled: false },
});
