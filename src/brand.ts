// 品牌名单一来源（sam 10-22 拍板）：对外叫「长尾雀」，Umbra 只是内部代号。
// 用户看得见的品牌字样一律从这里取；仓库名、包名、路由、域名、环境变量、插件 id 等标识符不跟着改。

const productName = '长尾雀';
/** 英文名（sam 10-23 定），读作 "kwe-tail"：que 是雀，tail 是尾巴。 */
const productNameEn = 'Quetail';

export const brand = {
  /** 对外产品名。 */
  productName,
  /** 英文界面显示的产品名。 */
  displayNameEn: productNameEn,
  /** 英文名；英文界面读 displayNameEn，这里也给必须是 ASCII 的地方用。 */
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
