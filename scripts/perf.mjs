// 首页天空的帧耗时测量（方案 §四 判据）：mid 档、4× CPU 节流，从头滚到尾，记每帧 frame() 的绘制耗时。
// 用法：npm run build && npm run perf   （TIER=high 可换档，CHROME=/path/to/chrome 可改浏览器路径）
// 判据量的是 JS 侧的绘制调用（场景里 performance.now() 包住 frame()），不含合成与 GPU 光栅化；
// 另外顺带报帧间隔（rAF 两次回调之间），超过 25 ms 的算掉帧，只报不拦。
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TIER = process.env.TIER || 'mid';
const BUDGET = 16;
const PORT = 4332;

const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'pipe' });
await new Promise((ok) => server.stdout.on('data', (d) => String(d).includes(String(PORT)) && ok()));
const browser = await chromium.launch({ executablePath: CHROME });
const rows = [];
let fail = false;

for (const [tag, vp] of [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: tag === 'phone' ? 3 : 2, isMobile: tag === 'phone', hasTouch: tag === 'phone' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`http://localhost:${PORT}/?tier=${TIER}&perf`, { waitUntil: 'networkidle' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(800);
  // 每层停一会儿、层与层之间分几步滚过去，过渡途中的帧也量到
  const ids = await page.$$eval('.dive .sec', (els) => els.map((e) => e.id));
  for (let i = 0; i < ids.length; i++) {
    for (let k = 0; k <= 4; k++) {
      await page.evaluate(([id, k, last]) => {
        const el = document.getElementById(id);
        const top = last ? el.offsetTop + el.offsetHeight - innerHeight : el.offsetTop + el.offsetHeight / 2 - innerHeight / 2;
        const prev = scrollY;
        scrollTo({ top: prev + (top - prev) * ((k + 1) / 5), behavior: 'instant' });
      }, [ids[i], k, i === ids.length - 1]);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(600);
  }
  const ms = await page.evaluate(() => window.__skyPerf || []);
  const gaps = await page.evaluate(() => window.__skyGap || []);
  const tier = await page.evaluate(() => document.documentElement.dataset.skyTier);
  const xs = ms.slice(5).sort((a, b) => a - b); // 前 5 帧是 JIT 预热
  const q = (p) => xs[Math.min(xs.length - 1, Math.floor(xs.length * p))] ?? 0;
  const row = { tag, tier, frames: xs.length, p50: q(0.5), p95: q(0.95), max: xs[xs.length - 1] ?? 0, dropped: gaps.slice(5).filter((g) => g > 25).length };
  rows.push(row);
  if (!xs.length || row.max > BUDGET || tier !== TIER) fail = true;
  await ctx.close();
}
await browser.close();
server.kill();

for (const r of rows) console.log(`${r.tag} · ${r.tier} 档 · 4× 节流 · ${r.frames} 帧 · p50 ${r.p50.toFixed(2)} ms · p95 ${r.p95.toFixed(2)} ms · 最长 ${r.max.toFixed(2)} ms · 帧间隔超过 25 ms 的 ${r.dropped} 次`);
if (fail) { console.error(`有帧超过 ${BUDGET} ms，或没量到帧 / 档位不对`); process.exit(1); }
console.log(`全部帧都在 ${BUDGET} ms 以内`);
