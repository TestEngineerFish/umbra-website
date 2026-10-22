// 品牌名单一来源（sam 10-22 拍板）：对外叫「长尾雀」，Umbra 只是内部代号。
// 用户看得见的品牌字样一律从这里取；仓库名、包名、路由、域名、环境变量、插件 id 等标识符不跟着改。

const productName = '长尾雀';
/** 英文名：还没定，先用拼音占位，不对外露出。 */
const productNameEn = 'Changweique';

export const brand = {
  /** 对外产品名。 */
  productName,
  /** 英文界面显示的产品名。英文名定下来之前也显示「长尾雀」；定了以后只改这一行，指向 productNameEn。 */
  displayNameEn: productName,
  /** 只用在必须是 ASCII、不能写中文的地方（每用一处都要在 PR 里列出）。目前官网没有用到。 */
  productNameEn,
  /** 昵称：先只进常量，页面上暂不使用。 */
  nickname: '雀雀',
  /** 内部代号：只出现在代码标识符里，页面上不显示。 */
  codename: 'Umbra',
  /** 设计软件的对外名。 */
  studioName: `${productName} Studio`,
};

/** 把文本里的 {productName} / {displayNameEn} / {studioName} 换成品牌名（法务 Markdown 这类不能写 TS 插值的地方用）。 */
export function fillBrand(text: string): string {
  return text.replace(/\{(productName|displayNameEn|studioName)\}/g, (_, k: 'productName' | 'displayNameEn' | 'studioName') => brand[k]);
}
