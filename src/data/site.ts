// 运营配置：会变、要 sam 填的东西都在这一个文件。文案在 src/i18n/，这里只放地址、编号、数字。
// 空字符串 / null = 还没有：页面按「未配置」画（下载卡显示「内测中」、页脚不画备案号），不会出一个坏链接。

export const site = {
  /** 服务端（公开接口：插件目录）。构建时取一次；取不到用 src/data/plugins-snapshot.json。 */
  apiBase: 'https://umbra.tingyusha.xyz',

  /** 账号中心（右上角「登录」）。Casdoor 10-18 已拍去掉，自建身份层的网页入口还没有 → 先空着，按钮指向下载页。 */
  accountUrl: '',

  /** 联系邮箱（帮助、内测、法务页共用）。【待填】 */
  contactEmail: '',

  /** ICP 备案号、公安联网备案号（大陆服务器上线必须挂在页脚）。【待填，W3 主体定了再办】 */
  icp: '',
  police: '',
  /** 公安备案号的查询链接里要带的编号（形如 11010802000000）。 */
  policeCode: '',

  /** 各端安装包。url 为空 = 内测中；available = false = 即将推出（连卡都灰）。 */
  downloads: {
    mac: { url: '', version: '', available: true },
    win: { url: '', version: '', available: true },
    ios: { url: '', version: '', available: true },
    android: { url: '', version: '', available: false },
  } as Record<'mac' | 'win' | 'ios' | 'android', { url: string; version: string; available: boolean }>,

  /**
   * 定价：与服务端 membership.py `DEFAULT_TIER` / `DEFAULT_CONFIG` 的初值一致（2026-10-10 定）。
   * 后台改了价，这里要跟着改 —— 页面上也写了「以客户端账号页为准」。
   */
  pricing: {
    monthCents: 1500,
    yearCents: 14800,
    discountPct: 95,
    trialDays: 7,
    memberStorageBytes: 1024 ** 3,
    freeStorageBytes: 100 * 1024 ** 2,
  },
};
