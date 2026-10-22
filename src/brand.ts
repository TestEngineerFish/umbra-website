// 品牌名单一来源（sam 10-22 拍板）：对外叫「悠蜗」，Umbra 只是内部代号。
// 用户看得见的品牌字样一律从这里取；仓库名、包名、路由、域名、环境变量、插件 id 等标识符不跟着改。

const productName = '悠蜗';

export const brand = {
  /** 对外产品名。 */
  productName,
  /** 英文名：还没定，先占位（en.ts 上线前要换掉）。 */
  productNameEn: 'Youwo',
  /** 内部代号：只出现在代码标识符里，页面上不显示。 */
  codename: 'Umbra',
  /** 设计软件的对外名。 */
  studioName: `${productName} Studio`,
};

/** 把文本里的 {productName} / {studioName} 换成品牌名（法务 Markdown 这类不能写 TS 插值的地方用）。 */
export function fillBrand(text: string): string {
  return text.replace(/\{(productName|productNameEn|studioName)\}/g, (_, k: 'productName' | 'productNameEn' | 'studioName') => brand[k]);
}
