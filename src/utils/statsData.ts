/**
 * 数据看板纯函数（M4 步 6；对应 margin 贡献日历/统计 —— 站点拉 GitHub
 * 贡献需 token 端上不做，看板数据 = stats.json 的发文热力图 + posts index
 * 聚合 + tags 计数）。纯数据零 Taro 依赖，可单测。
 *
 * 口径与 mine 页 53 周窗口同族（D28）：周日起始、缺文日补 0、未来日不渲染；
 * 月份标签 = 含当月 1 号的列（GitHub 规则）+ 5 列防碰撞；年标签 = 含当年
 * 1 月 1 号的列。日期一律设备本地（D62：与端上其余口径一致；午夜档对聚合
 * 总量无影响）。
 */

export interface HeatDay {
  date: string;
  count: number;
}

export interface HeatGrid {
  /** 每列一周（周日起），长度 = 覆盖首末有文日至今天的周数 */
  cols: number[][];
  /** 与 cols 等长的月份标签槽（null = 不标；防碰撞后） */
  months: (string | null)[];
  /** 与 cols 等长的年份标签槽（null = 不标；每年首月列标年） */
  years: (string | null)[];
  /** 网格内单日最大发文数（强度分档分母） */
  max: number;
  /** 网格内总发文数（应等于输入 days 合计 —— 未来日不渲染不影响既有日） */
  total: number;
  /** 网格内已渲染天数 */
  rendered: number;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** 稀疏有文日 → 全时段密集网格（首文日所在周的周日 → 今天） */
export function fullHeatmap(days: HeatDay[]): HeatGrid {
  if (days.length === 0) {
    return { cols: [], months: [], years: [], max: 0, total: 0, rendered: 0 };
  }
  const counts = new Map(days.map(d => [d.date, d.count]));
  const total = days.reduce((s, d) => s + d.count, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 起点 = 最早有文日所在周的周日（D28：周日起始；首文日之前不渲染）。
  // 不假定 days 有序 —— 取全量最小日期（date 为 YYYY-MM-DD 字典序即时序）。
  const earliest = days.reduce((m, d) => (d.date < m ? d.date : m), days[0].date);
  const first = new Date(`${earliest}T00:00:00`);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const cols: number[][] = [];
  const months: (string | null)[] = [];
  const years: (string | null)[] = [];
  let max = 0;
  let rendered = 0;
  const cur = new Date(start);
  while (cur <= today) {
    const col: number[] = [];
    let monthStart = -1;
    let yearStart = -1;
    for (let i = 0; i < 7 && cur <= today; i++) {
      if (cur.getDate() === 1) {
        monthStart = cur.getMonth();
        if (cur.getMonth() === 0) yearStart = cur.getFullYear();
      }
      const c = counts.get(dayKey(cur)) ?? 0;
      if (c > max) max = c;
      col.push(c);
      rendered++;
      cur.setDate(cur.getDate() + 1);
    }
    cols.push(col);
    months.push(monthStart >= 0 ? `${monthStart + 1}月` : null);
    years.push(yearStart >= 0 ? String(yearStart) : null);
  }
  return { cols, months, years, max, total, rendered };
}

/** 热力图强度档（0–4）：0 = 无文空格；其余按 max 线性四档（mine 页同款） */
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 0) return 1;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4;
}

/** 按月聚合发文（本地年月；升序返回，含 0 篇月不补 —— 节奏图按年铺 12 格） */
export function monthlyPosts(posts: { pubDatetime: string }[]): Map<string, number> {
  const byMonth = new Map<string, number>();
  for (const p of posts) {
    const d = new Date(p.pubDatetime);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + 1);
  }
  return byMonth;
}

/** 年份 → 12 个月计数数组（发文节奏图数据；缺月 = 0，年份升序） */
export function postsByYear(
  byMonth: Map<string, number>
): { year: number; months: number[] }[] {
  const years = new Map<number, number[]>();
  for (const [ym, n] of byMonth) {
    const [y, m] = ym.split("-").map(Number);
    const arr = years.get(y) ?? Array.from({ length: 12 }, () => 0);
    arr[m - 1] += n;
    years.set(y, arr);
  }
  return [...years.entries()]
    .map(([year, months]) => ({ year, months }))
    .sort((a, b) => a.year - b.year);
}

/** 标签 TopN（count 降序；并列保持入序稳定） */
export function topTags(
  tags: { name: string; count: number }[],
  n = 10
): { name: string; count: number }[] {
  return [...tags].sort((a, b) => b.count - a.count).slice(0, n);
}
