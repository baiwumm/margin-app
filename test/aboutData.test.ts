import { describe, expect, it } from "vitest";

import {
  ABOUT_SKILLS,
  PLEDGE_END,
  PLEDGE_START,
  tenYearProgress,
} from "@/utils/aboutData";

/** 期望值独立算式：直接用 UTC 日数差，不经过 tenYearProgress 的钳制/折算路径 */
const utcDaysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const TOTAL = utcDaysBetween(PLEDGE_START, PLEDGE_END);

describe("tenYearProgress（十年之约，margin TenYearPledge 同算式）", () => {
  it("总天数 = 3653（2023-04-29 → 2033-04-29，含 2024/2028/2032 三个闰年）", () => {
    expect(TOTAL).toBe(3653);
    expect(tenYearProgress(new Date(PLEDGE_START)).totalDays).toBe(3653);
  });

  it("未开始：进度钳 0、剩余 = 全程", () => {
    const p = tenYearProgress(new Date("2023-01-01T00:00:00+08:00"));
    expect(p.elapsedDays).toBe(0);
    expect(p.percent).toBe(0);
    expect(p.remainingDays).toBe(TOTAL);
  });

  it("进行中（2026-10-14）：已过天数与独立算式逐等", () => {
    const at = "2026-10-14T00:00:00+08:00";
    const expectedElapsed = utcDaysBetween(PLEDGE_START, at);
    const p = tenYearProgress(new Date(at));
    expect(p.elapsedDays).toBe(expectedElapsed);
    expect(p.remainingDays).toBe(TOTAL - expectedElapsed);
    expect(p.percent).toBeCloseTo((expectedElapsed / TOTAL) * 100, 10);
  });

  it("恰在起点瞬时：0 天", () => {
    const p = tenYearProgress(new Date(PLEDGE_START));
    expect(p.elapsedDays).toBe(0);
    expect(p.percent).toBe(0);
  });

  it("已结束：进度钳满 100、剩余 0、年月折算归零", () => {
    const p = tenYearProgress(new Date("2034-01-01T00:00:00+08:00"));
    expect(p.elapsedDays).toBe(TOTAL);
    expect(p.percent).toBe(100);
    expect(p.remainingDays).toBe(0);
    expect(p.remainingYears).toBe(0);
    expect(p.remainingMonths).toBe(0);
  });
});

describe("关于页静态内容形状", () => {
  it("技能跑马灯 11 项且 key 唯一（对应 11×2 枚 PNG 资产）", () => {
    expect(ABOUT_SKILLS.length).toBe(11);
    expect(new Set(ABOUT_SKILLS.map(s => s.key)).size).toBe(11);
  });
});
