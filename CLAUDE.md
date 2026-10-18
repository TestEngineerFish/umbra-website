# UmbraWeb 开发约定

1. **文案只在 `src/i18n/zh.ts`**，模板里不写死中文（英文版以后加 `en.ts`）。只写**已经上线**的能力；写之前回各仓代码 / `doc/` 状态行核一遍。
2. **颜色只用 tokens**（`src/styles/tokens.css` 由 `npm run tokens` 从设计包生成）。唯一例外是首页海洋世界：它不跟明暗主题，颜色写在 `index.astro` 与 `scene.ts` 里。
3. **国内访问**：不引任何境外字体 / 统计 / CDN —— `scripts/check-dist.mjs` 会拦。字体只用系统字体栈。
4. **性能预算**：首页 JS gzip < 150 KB、单张截图 < 300 KB（check-dist 拦）；动画只改 transform / opacity 或画 canvas；`prefers-reduced-motion` 必须有静态版。
5. **验证**：改完跑 `npm run verify`；动了版面再 `npm run snap` 看截图（含手机宽度、横向溢出检查）。
6. **提交**：验证全绿后直接 commit（中文信息）。还没有远端仓库。
7. 截图里不能出现像真实个人信息的内容（手机号、卡号、邮箱），用 example 数据。
