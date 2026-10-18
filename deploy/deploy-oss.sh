#!/usr/bin/env bash
# 把 dist/ 发到阿里云 OSS（前面挂 CDN）。还没跑过 —— 域名（W2）和备案（W3）定了才上线。
#
# 前置：装 ossutil 2.x 并配好凭证（ossutil config），建好 bucket 并开静态网站托管（默认首页 index.html、404 页 404.html）。
# 用法：OSS_BUCKET=umbra-web ./deploy/deploy-oss.sh
#
# 缓存策略：
# - HTML：no-cache（每次回源校验，发版立即生效）
# - /_astro/ 下带内容哈希的 JS / CSS：一年 + immutable
# - 截图、图标等其余静态文件：一天
set -euo pipefail
: "${OSS_BUCKET:?设置 OSS_BUCKET}"
cd "$(dirname "$0")/.."

npm run verify

DST="oss://${OSS_BUCKET}"
ossutil cp -r dist/_astro "${DST}/_astro" -f --meta "Cache-Control:public, max-age=31536000, immutable"
ossutil cp -r dist "${DST}" -f --exclude "*.html" --exclude "_astro/*" --meta "Cache-Control:public, max-age=86400"
ossutil cp -r dist "${DST}" -f --include "*.html" --meta "Cache-Control:no-cache"
echo "已发到 ${DST}；CDN 记得刷新 HTML 缓存（或在控制台按目录刷新 /）。"
