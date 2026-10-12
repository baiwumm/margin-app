import { describe, expect, it } from "vitest";

import { dayKeyLocal, formatDateLocal } from "@/utils/date";

/** D60：本地时区日期格式化。样本一律由本地组件生成 ⇒ 任何 TZ 下语义一致 */
const local = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m - 1, d, h, 0, 0).toISOString();

describe("formatDateLocal", () => {
  it("输出 YYYY-MM-DD（本地日期）", () => {
    expect(formatDateLocal(local(2026, 8, 19))).toBe("2026-08-19");
    expect(formatDateLocal(local(2026, 12, 31))).toBe("2026-12-31");
  });

  it("午夜档按本地日期（东八区设备 = 站点 tz 口径；语料 27 篇同形状）", () => {
    // 本地 2026-08-19 00:30 发布
    const iso = new Date(2026, 7, 19, 0, 30).toISOString();
    expect(formatDateLocal(iso)).toBe("2026-08-19");
  });

  it("跨年：本地 12-31 23 点与次日 0 点半", () => {
    expect(formatDateLocal(new Date(2025, 11, 31, 23).toISOString())).toBe("2025-12-31");
    expect(formatDateLocal(new Date(2026, 0, 1, 0, 30).toISOString())).toBe("2026-01-01");
  });

  it("两位补零", () => {
    expect(formatDateLocal(local(2026, 3, 9))).toBe("2026-03-09");
  });

  it("非法日期回落 slice(0,10)（与旧行为一致的兜底）", () => {
    expect(formatDateLocal("not-a-date")).toBe("not-a-date");
  });
});

describe("dayKeyLocal", () => {
  it("同日同键、跨日不同键", () => {
    expect(dayKeyLocal(new Date(2026, 7, 19, 0, 30).toISOString())).toBe(
      dayKeyLocal(new Date(2026, 7, 19, 23).toISOString())
    );
    expect(dayKeyLocal(local(2026, 8, 19))).not.toBe(dayKeyLocal(local(2026, 8, 20)));
  });
});
