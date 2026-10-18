// 定价页的数字。纯函数，测试见 tests/price.test.ts。
// 单位与服务端一致：价格存「分」（membership.py `price_month_cents` / `price_year_cents`）。

/** 分 → 「¥15」/「¥14.8」：整元不带小数，有角分最多两位、去掉尾零。 */
export function yuan(cents: number): string {
  const v = cents / 100;
  return '¥' + (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
}

/** 年付折合每月（分，四舍五入）。 */
export const perMonthOfYear = (yearCents: number): number => Math.round(yearCents / 12);

/** 年付比按月付一年省多少（分）；不省回 0。 */
export const yearSaving = (monthCents: number, yearCents: number): number => Math.max(0, monthCents * 12 - yearCents);

/** 会员折扣显示：95 → 「95 折」，90 → 「9 折」，100 → 「不打折」。 */
export function discountLabel(pct: number): string {
  if (pct >= 100) return '不打折';
  return (pct % 10 === 0 ? String(pct / 10) : String(pct)) + ' 折';
}

/** 字节 → 「100 MB」/「1 GB」（1024 进制，和服务端 storage_bytes 同口径）。 */
export function bytesLabel(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${Number.isInteger(v) ? v : v.toFixed(1)} ${units[i]}`;
}
