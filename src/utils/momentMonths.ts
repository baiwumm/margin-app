/**
 * 瞬间页的月份轴纯函数（M3 步 1 从 pages/moment/index.tsx 抽出）。
 * 抽出来的唯一理由是**可单测**：原先内联在页面里，跨年窗口与钳制边界没有任何断言覆盖。
 * 月份一律用 "YYYY-MM" 字符串表示 —— 字典序即时间序，比较不需要 Date。
 */

/** 月份键（按 pubDatetime 端上聚合） */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** 月份位移（n 可为负）；年份足够大时 total 恒正，取模不会翻负 */
export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** 6 月一屏的窗口起点（1-6 月 → 当年 1 月；7-12 月 → 当年 7 月） */
export function windowStartFor(key: string): string {
  const y = Number(key.slice(0, 4));
  return Number(key.slice(5, 7)) <= 6 ? `${y}-01` : `${y}-07`;
}

/** 当前窗口的连续月份（空数据月照常占位） */
export function monthWindow(winStart: string, size = 6): string[] {
  if (!winStart) return [];
  return Array.from({ length: size }, (_, i) => addMonths(winStart, i));
}

/**
 * 翻页边界：min = 最早数据年的 1 月，max = 最晚数据年 +1 的 7 月。
 * 两端都是窗口起点（上半年 01 / 下半年 07），所以窗口能恰好滑到只含最早月与最晚月的位置。
 * thisYear 可注入，只为单测不依赖系统时钟。
 */
export function monthBounds(
  keys: readonly string[],
  thisYear = new Date().getFullYear()
): { min: string; max: string } {
  const sorted = [...keys].sort();
  const min = sorted.length
    ? `${Number(sorted[0].slice(0, 4))}-01`
    : `${thisYear}-01`;
  const max = sorted.length
    ? `${Number(sorted[sorted.length - 1].slice(0, 4)) + 1}-07`
    : `${thisYear}-07`;
  return { min, max };
}

/** 窗口位移；越界返回 null（调用方保持原窗口不变） */
export function shiftWindow(
  winStart: string,
  dir: -1 | 1,
  bounds: { min: string; max: string },
  size = 6
): string | null {
  if (!winStart) return null;
  const next = addMonths(winStart, dir * size);
  return next < bounds.min || next > bounds.max ? null : next;
}

/** 逐月计数（验收②「月份切换计数正确」的数据源） */
export function countsByMonth(
  moments: readonly { pubDatetime: string }[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of moments) {
    const k = monthKey(m.pubDatetime);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
