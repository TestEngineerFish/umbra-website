// 法务 Markdown 里的 {productName} / {studioName} 占位，构建时换成 src/brand.ts 的品牌名。
// 只换正文文本节点；行内代码（环境变量名等标识符）不动。
import { fillBrand } from '../brand';

interface MdNode { type: string; value?: string; children?: MdNode[] }

function walk(node: MdNode): void {
  if (node.type === 'text' && typeof node.value === 'string') node.value = fillBrand(node.value);
  node.children?.forEach(walk);
}

export default function remarkBrand() {
  return (tree: MdNode) => walk(tree);
}
