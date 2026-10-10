import { describe, expect, it } from "vitest";

import { archiveDay, archiveGroups } from "@/utils/archives";
import type { PostMeta } from "@/types/api";

/**
 * M4 步 1：归档分组（年→月→日，设备本地时区倒序）。
 * 构造刻意绕开运行时区：样本一律由「本地组件」生成 ISO ⇒ 任何 TZ 下语义一致；
 * 午夜档样本 = 本地 00:30 发布（东八区设备上等价于语料里 UTC 16:00 那 27 篇）。
 */
function post(slug: string, local: Date): PostMeta {
  return {
    slug,
    path: `/posts/${slug}`,
    title: slug,
    description: "",
    tags: [],
    pubDatetime: local.toISOString(),
    modDatetime: null,
    featured: false,
    draft: false,
    ogImage: null,
    readingTime: 1,
    wordCount: 1,
  };
}

const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min, 0);

describe("archiveGroups", () => {
  it("年 → 月 → 文章 三级分组，全新在前、同月新的在前", () => {
    const posts = [
      post("old", at(2024, 3, 5)),
      post("new-year", at(2026, 1, 2)),
      post("mid-a", at(2025, 12, 1)),
      post("mid-b", at(2025, 12, 20)),
      post("new-month", at(2026, 2, 9)),
    ];
    const g = archiveGroups(posts);
    expect(g.map(y => y.year)).toEqual([2026, 2025, 2024]);
    expect(g[0].months.map(m => m.month)).toEqual([2, 1]);
    expect(g[0].months[0].posts.map(p => p.slug)).toEqual(["new-month"]);
    // 同月内按时间倒序（12-20 在 12-01 前）
    expect(g[1].months[0].posts.map(p => p.slug)).toEqual(["mid-b", "mid-a"]);
  });

  it("午夜档按本地日期归组（东八区设备 = 站点 tz 口径）", () => {
    // 本地 2026-08-19 00:30 发布（ISO 在 UTC 下会是 8-18 16:30 ⇒ 语料 27 篇同形状）
    const posts = [post("midnight", at(2026, 8, 19, 0, 30))];
    const g = archiveGroups(posts);
    expect(g).toHaveLength(1);
    expect(g[0].year).toBe(2026);
    expect(g[0].months[0].month).toBe(8);
    expect(archiveDay(posts[0].pubDatetime)).toBe("19");
  });

  it("跨年样本：本地 12-31 与次年 1-1 分落两年", () => {
    const posts = [post("dec31", at(2025, 12, 31, 23)), post("jan1", at(2026, 1, 1, 0, 30))];
    const g = archiveGroups(posts);
    expect(g.map(y => y.year)).toEqual([2026, 2025]);
    expect(g[0].months[0].month).toBe(1);
    expect(g[1].months[0].month).toBe(12);
  });

  it("空列表出空数组；坏日期跳过不炸", () => {
    expect(archiveGroups([])).toEqual([]);
    const bad = { ...post("bad", at(2026, 1, 1)), pubDatetime: "not-a-date" };
    const g = archiveGroups([bad, post("ok", at(2026, 5, 1))]);
    expect(g).toHaveLength(1);
    expect(g[0].months[0].posts.map(p => p.slug)).toEqual(["ok"]);
  });

  it("不修改入数组（排序在副本上做）", () => {
    const posts = [post("a", at(2026, 1, 1)), post("b", at(2026, 2, 1))];
    const snapshot = posts.map(p => p.slug);
    archiveGroups(posts);
    expect(posts.map(p => p.slug)).toEqual(snapshot);
  });
});

describe("archiveDay", () => {
  it("两位补零（本地日期）", () => {
    expect(archiveDay(at(2026, 3, 9).toISOString())).toBe("09");
    expect(archiveDay(at(2026, 3, 21).toISOString())).toBe("21");
  });
});
