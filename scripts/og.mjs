// 生成分享卡片 public/og.png（1200×630）：首页首屏那一帧。改了首屏后重跑：npm run build && node scripts/og.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const server = spawn('npx', ['astro', 'preview', '--port', '4330'], { stdio: 'pipe' });
await new Promise((ok) => server.stdout.on('data', (d) => String(d).includes('4330') && ok()));
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto('http://localhost:4330/', { waitUntil: 'networkidle' });
// 分享图里不要顶栏、刻度尺、按钮
await page.addStyleTag({ content: '.hd,.gauge,.cta,.hero .eyebrow{display:none!important}.hero{padding-top:140px!important;padding-left:72px!important}.hero-lead{max-width:30rem!important}' });
await page.waitForTimeout(1500);
await page.screenshot({ path: new URL('../public/og.png', import.meta.url).pathname });
await browser.close();
server.kill();
console.log('public/og.png');
