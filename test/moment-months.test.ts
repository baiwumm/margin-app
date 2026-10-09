import { describe, expect, it } from "vitest";

import {
  addMonths,
  countsByMonth,
  monthBounds,
  monthKey,
  monthWindow,
  shiftWindow,
  windowStartFor,
} from "@/utils/momentMonths";

/** 线上语料的真实月份分布（探针 m3-corpus.mjs，2026-10-09 量得：9 条瞬间跨两个半年窗口） */
const REAL_KEYS = ["2026-09", "2026-08", "2026-08", "2026-08", "2026-05", "2026-04", "2026-04", "2025-07", "2025-06"];

describe("monthKey", () => {
  it("取 ISO 前 7 位", () => {
    expect(monthKey("2026-09-21T08:00:00.000Z")).toBe("2026-09");
  });
});

describe("addMonths", () => {
  it("同年内位移", () => {
    expect(addMonths("2026-03", 2)).toBe("2026-05");
  });
  it("向下跨年", () => {
    expect(addMonths("2026-01", -7)).toBe("2025-06");
  });
  it("向上跨年", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
  });
  it("半年窗口整步", () => {
    expect(addMonths("2025-01", 6)).toBe("2025-07");
    expect(addMonths("2025-01", -6)).toBe("2024-07");
  });
  it("零位移不动", () => {
    expect(addMonths("2026-12", 0)).toBe("2026-12");
  });
});

describe("windowStartFor", () => {
  it("上半年归当年 1 月", () => {
    expect(windowStartFor("2026-01")).toBe("2026-01");
    expect(windowStartFor("2026-06")).toBe("2026-01");
  });
  it("下半年归当年 7 月", () => {
    expect(windowStartFor("2026-07")).toBe("2026-07");
    expect(windowStartFor("2026-12")).toBe("2026-07");
  });
});

describe("monthWindow", () => {
  it("6 格连续月，跨年接得上", () => {
    expect(monthWindow("2026-07")).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });
  it("窗口起点为空时不出格", () => {
    expect(monthWindow("")).toEqual([]);
  });
});

describe("monthBounds", () => {
  it("真实语料：min = 最早年 1 月，max = 最晚年 +1 的 7 月", () => {
    expect(monthBounds(REAL_KEYS, 2026)).toEqual({ min: "2025-01", max: "2027-07" });
  });
  it("乱序输入不影响结果", () => {
    const shuffled = [...REAL_KEYS].reverse();
    expect(monthBounds(shuffled, 2026)).toEqual({ min: "2025-01", max: "2027-07" });
  });
  it("无数据时按注入的当年兜底（不读系统时钟）", () => {
    expect(monthBounds([], 2030)).toEqual({ min: "2030-01", max: "2030-07" });
  });
});

describe("shiftWindow", () => {
  const bounds = monthBounds(REAL_KEYS, 2026);

  it("窗口内正常翻", () => {
    expect(shiftWindow("2026-07", 1, bounds)).toBe("2027-01");
    expect(shiftWindow("2025-07", -1, bounds)).toBe("2025-01");
  });
  it("上界之外返回 null（2027-07 已是最后一个窗口）", () => {
    expect(shiftWindow("2027-07", 1, bounds)).toBeNull();
  });
  it("下界之外返回 null", () => {
    expect(shiftWindow("2025-01", -1, bounds)).toBeNull();
  });
  it("起点为空返回 null", () => {
    expect(shiftWindow("", 1, bounds)).toBeNull();
  });
});

describe("countsByMonth", () => {
  it("逐月计数与真实分布逐等", () => {
    const moments = REAL_KEYS.map((k, i) => ({ pubDatetime: `${k}-${String(i % 27) + 1}T00:00:00Z` }));
    expect(countsByMonth(moments)).toEqual({
      "2026-09": 1,
      "2026-08": 3,
      "2026-05": 1,
      "2026-04": 2,
      "2025-07": 1,
      "2025-06": 1,
    });
  });
  it("空列表出空对象", () => {
    expect(countsByMonth([])).toEqual({});
  });
});
