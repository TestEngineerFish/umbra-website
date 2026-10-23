# UmbraWebsite · Umbra 官网

Umbra 的门户网站。首页是一次「下潜」：从日落海平面一路滚到海底，每一层讲一个能力；
功能子页是苹果式叙事（截图钉住、章节逐段亮）；另有下载、定价、Studio、插件、更新日志、帮助、法务页。

方案与取舍见 `Geek/doc/官网(门户网站)-调研与设计草案.md`。

## 跑起来

```bash
npm install
npm run dev        # http://localhost:4321
npm run verify     # 类型检查 + 单测 + 构建 + 产物检查（链接 / 首页 JS 预算 / 截图大小 / 不许境外资源）
npm run snap       # 先 build；用系统 Chrome 截全站（桌面 / 手机 × 亮 / 暗），输出 .shots-tmp/snap/
```

## 改东西去哪

| 要改 | 文件 |
|---|---|
| 所有文案（导航、首页七段、功能页、定价、帮助…） | `src/i18n/zh.ts` |
| 下载地址、备案号、联系邮箱、价格数字 | `src/data/site.ts` |
| 更新日志 | `src/data/changelog.ts` |
| 隐私政策 / 用户协议（草案） | `src/legal/*.md` |
| 产品截图 | `public/shots/<名字>.webp`（名字见 zh.ts 里各功能的 `shot` / `phone`） |
| 颜色 | **别手改** `src/styles/tokens.css`：设计包升版后 `npm run tokens` |
| 首页天空场景 | `src/scripts/sky/scene.ts`（画）· `layers.ts`（分层表 LAYERS，段数只由它决定）· `textures.ts`（启动时生成的云 / 银河贴图）· `tier.ts`（设备分档）· `shared/camera.ts`（滚动 → 相机） |
| 分享卡片 | `npm run build && node scripts/og.mjs` → `public/og.png` |

## 部署

静态产物丢阿里云 OSS + CDN：`OSS_BUCKET=… ./deploy/deploy-oss.sh`（还没跑过，等域名与备案）。
