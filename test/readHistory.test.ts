import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 阅读记录 store 测试：单例模块用 vi.resetModules + 动态 import 做每例隔离
 * （favorites 同款）。
 */
type Hist = typeof import("@/utils/readHistory");

let hist: Hist;

beforeEach(async () => {
  vi.resetModules();
  hist = (await import("@/utils/readHistory")) as Hist;
});

describe("阅读记录 store（favorites 同款单例 + 订阅）", () => {
  it("未水合时为空；水合合法数据后可读", () => {
    expect(hist.getReadHistory()).toEqual([]);
    hist.hydrateReadHistory(JSON.stringify([{ slug: "abc", readAt: 5 }]));
    expect(hist.getReadHistory()).toEqual([{ slug: "abc", readAt: 5 }]);
  });

  it("水合容错：坏 JSON → 空", () => {
    hist.hydrateReadHistory("not-json");
    expect(hist.getReadHistory()).toEqual([]);
  });

  it("normalize 脏数据：非对象/空 slug/重复 过滤", () => {
    hist.hydrateReadHistory(
      JSON.stringify([
        { slug: "ok", readAt: 3 },
        "junk",
        { slug: "" },
        { slug: "dup" },
        { slug: "dup" },
      ])
    );
    expect(hist.getReadHistory()).toEqual([
      { slug: "ok", readAt: 3 },
      { slug: "dup", readAt: 0 },
    ]);
  });

  it("add：置顶 + 去重刷新时间戳", () => {
    hist.hydrateReadHistory("[]");
    hist.addReadHistory("a");
    hist.addReadHistory("b");
    hist.addReadHistory("a");
    const list = hist.getReadHistory();
    expect(list.map(x => x.slug)).toEqual(["a", "b"]);
    expect(list[0].readAt).toBeGreaterThanOrEqual(list[1].readAt);
  });

  it("容量 50：滚动淘汰最旧", () => {
    hist.hydrateReadHistory("[]");
    for (let i = 0; i < hist.READ_HISTORY_MAX + 3; i++) hist.addReadHistory(`s${i}`);
    const list = hist.getReadHistory();
    expect(list.length).toBe(hist.READ_HISTORY_MAX);
    expect(list[0].slug).toBe(`s${hist.READ_HISTORY_MAX + 2}`);
    expect(list.some(x => x.slug === "s0")).toBe(false);
  });

  it("clearReadHistory 一键清空并广播", () => {
    hist.hydrateReadHistory("[]");
    hist.addReadHistory("a");
    const seen: number[] = [];
    const off = hist.subscribeReadHistory(v => seen.push(v.length));
    hist.clearReadHistory();
    off();
    hist.addReadHistory("b"); // 已退订不广播
    expect(hist.getReadHistory().map(x => x.slug)).toEqual(["b"]);
    expect(seen).toEqual([0]); // 订阅在 add 之后 ⇒ 只收到 clear 的一次
  });

  it("空 slug 不产生变更", () => {
    hist.hydrateReadHistory("[]");
    hist.addReadHistory("");
    expect(hist.getReadHistory()).toEqual([]);
  });

  it("水合幂等：二次水合不覆盖运行时状态", () => {
    hist.hydrateReadHistory("[]");
    hist.addReadHistory("keep");
    hist.hydrateReadHistory(JSON.stringify([{ slug: "other", readAt: 1 }]));
    expect(hist.getReadHistory().map(x => x.slug)).toEqual(["keep"]);
  });
});
