import { describe, expect, it } from "vitest";

import {
  fullHeatmap,
  heatLevel,
  monthlyPosts,
  postsByYear,
  topTags,
} from "@/utils/statsData";

/** 本地日期键（与被测函数同口径，期望值独立构造） */
const key = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

describe("fullHeatmap（全时段热力图网格）", () => {
  it("空输入 → 空网格", () => {
    const g = fullHeatmap([]);
    expect(g.cols).toEqual([]);
    expect(g.months).toEqual([]);
    expect(g.years).toEqual([]);
    expect(g.total).toBe(0);
  });

  it("周日起始 + 未来日不渲染 + 总数/最大值逐等", () => {
    // 2026-10-14 是周三；2026-10-05 是周一 → 首文日所在周周日 = 2026-10-04
    const days = [
      { date: key(2026, 10, 5), count: 2 }, // 周一
      { date: key(2026, 10, 6), count: 1 }, // 周二
      { date: key(2026, 10, 14), count: 3 }, // 今天（周三）
    ];
    const g = fullHeatmap(days);
    // 2026-10-04（周日）→ 2026-10-14（今天）共 11 天 = 2 列（7 + 4）
    expect(g.cols.length).toBe(2);
    expect(g.cols[0].length).toBe(7);
    expect(g.cols[1].length).toBe(4);
    // 首列：周日 0、周一 2、周二 1、周三~周六 0
    expect(g.cols[0]).toEqual([0, 2, 1, 0, 0, 0, 0]);
    // 次列：周日 0、周一 0、周二 0、周三 3
    expect(g.cols[1]).toEqual([0, 0, 0, 3]);
    expect(g.total).toBe(6);
    expect(g.max).toBe(3);
    expect(g.rendered).toBe(11);
  });

  it("输入无序时取全量最小日期为起点（不假定 days 有序）", () => {
    const days = [
      { date: key(2026, 10, 14), count: 1 },
      { date: key(2026, 9, 28), count: 1 }, // 周一（更早）
    ];
    const g = fullHeatmap(days);
    // 2026-09-28 是周一 → 所在周周日 = 09-27；到今天 18 天 = 3 列（7+7+4）
    expect(g.cols.length).toBe(3);
    expect(g.total).toBe(2);
  });

  it("月份标签 = 含当月 1 号的列；年份标签只落在 1 月 1 号的列", () => {
    const days = [{ date: key(2026, 1, 1), count: 1 }];
    const g = fullHeatmap(days);
    // 2026-01-01 是周四 → 所在周周日 = 2025-12-28 ⇒ 首列即「1月」且跨年
    const firstMonthCol = g.months.findIndex(m => m === "1月");
    const firstYearCol = g.years.findIndex(y => y === "2026");
    expect(firstMonthCol).toBe(0);
    expect(firstYearCol).toBe(0);
    // 后续 2026 各月 1 号列也应有月份标签（2026-02-01 是周日，就在某列第 0 行）
    expect(g.months.filter(Boolean).length).toBeGreaterThan(1);
  });

  it("窗口模式：只渲染最近 N 周（今天锚定回退），窗口外有文日不计入", () => {
    const days = [
      { date: key(2026, 10, 14), count: 1 }, // 今天（周三）
      { date: key(2026, 10, 12), count: 2 }, // 本周一
      { date: key(2026, 1, 1), count: 9 }, // 窗口外
    ];
    const g = fullHeatmap(days, 2); // 最近 2 周
    // 今天周三 ⇒ 本周周日 = 10-11；回退 1 周 = 10-04 ⇒ 2 列（7 + 4，末列到今天截断）
    expect(g.cols.length).toBe(2);
    expect(g.cols[0]).toEqual([0, 0, 0, 0, 0, 0, 0]); // 10-04~10-10：窗口内无文
    expect(g.cols[1]).toEqual([0, 2, 0, 1]); // 10-11~10-14：周一 2、周三 1
    expect(g.total).toBe(3); // 窗口外那 9 篇不计入
    expect(g.max).toBe(2);
  });

  it("窗口 = 53 周 ⇒ 恰好 53 列（margin「过去一年」口径；与 mine 页窗口同构）", () => {
    const g = fullHeatmap([{ date: key(2026, 1, 1), count: 1 }], 53);
    expect(g.cols.length).toBe(53);
    expect(g.rendered).toBeGreaterThanOrEqual(365);
  });

  it("右缘护栏：末 2 列不渲染标签（标签宽约 40rpx，末列槽位不足会溢出）", () => {
    // 窗口 2 周：10-11 那列是「10月」列且是末列 ⇒ 应被护栏清掉
    const days = [{ date: key(2026, 10, 12), count: 1 }];
    const g = fullHeatmap(days, 2);
    expect(g.months[g.months.length - 1]).toBeNull();
    expect(g.months[g.months.length - 2]).toBeNull();
    // 窗口拉长到 6 周，「10月」列离右缘 ≥2 列 ⇒ 保留
    const g6 = fullHeatmap(days, 6);
    expect(g6.months).toContain("10月");
  });

  it("单日最大值为强度分档分母（mine 页同款）", () => {
    const days = [
      { date: key(2026, 10, 1), count: 1 },
      { date: key(2026, 10, 2), count: 5 },
    ];
    expect(fullHeatmap(days).max).toBe(5);
    expect(heatLevel(1, 5)).toBe(1); // ceil(1/5*4)=1
    expect(heatLevel(2, 5)).toBe(2); // ceil(2/5*4)=2
    expect(heatLevel(4, 5)).toBe(4); // ceil(4/5*4)=4
    expect(heatLevel(5, 5)).toBe(4);
    expect(heatLevel(0, 5)).toBe(0);
    expect(heatLevel(3, 0)).toBe(1); // max<=0 时有文日兜底 1 档
  });
});

describe("monthlyPosts / postsByYear（发文节奏）", () => {
  it("按月聚合 + 按年铺 12 格", () => {
    const posts = [
      { pubDatetime: "2026-01-05T10:00:00+08:00" },
      { pubDatetime: "2026-01-20T10:00:00+08:00" },
      { pubDatetime: "2026-03-11T10:00:00+08:00" },
      { pubDatetime: "2025-12-31T16:00:00Z" }, // UTC 午夜档 → 本地 2026-01-01
    ];
    const byMonth = monthlyPosts(posts);
    // 独立期望：2026-01 共 3 篇（含午夜档那篇）、2026-03 一篇
    expect(byMonth.get("2026-01")).toBe(3);
    expect(byMonth.get("2026-03")).toBe(1);
    const years = postsByYear(byMonth);
    expect(years.map(y => y.year)).toEqual([2026]);
    expect(years[0].months[0]).toBe(3); // 1 月
    expect(years[0].months[2]).toBe(1); // 3 月
    expect(years[0].months[11]).toBe(0); // 12 月补 0
  });
});

describe("topTags", () => {
  it("count 降序取前 N、并列保持入序", () => {
    const tags = [
      { name: "a", count: 3 },
      { name: "b", count: 9 },
      { name: "c", count: 3 },
      { name: "d", count: 5 },
    ];
    expect(topTags(tags, 3)).toEqual([
      { name: "b", count: 9 },
      { name: "d", count: 5 },
      { name: "a", count: 3 },
    ]);
  });
});
