import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 收藏 store 测试：模块是单例（prefs 同款），用 vi.resetModules + 动态 import
 * 做每例隔离；水合幂等（二次水合不覆盖运行时状态）本身也是一个被测行为。
 */
type Fav = typeof import("@/utils/favorites");

let fav: Fav;

beforeEach(async () => {
  vi.resetModules();
  fav = (await import("@/utils/favorites")) as Fav;
});

describe("收藏 store（prefs 同款单例 + 订阅）", () => {
  it("未水合时为空；水合合法数据后可读", () => {
    expect(fav.getFavorites()).toEqual([]);
    fav.hydrateFavorites(JSON.stringify([{ slug: "abc", addedAt: 5 }]));
    expect(fav.getFavorites()).toEqual([{ slug: "abc", addedAt: 5 }]);
    expect(fav.isFavorite("abc")).toBe(true);
    expect(fav.isFavorite("nope")).toBe(false);
  });

  it("水合容错：坏 JSON → 空", () => {
    fav.hydrateFavorites("not-json");
    expect(fav.getFavorites()).toEqual([]);
  });

  it("normalize 脏数据：非对象/空 slug/重复 过滤", () => {
    fav.hydrateFavorites(
      JSON.stringify([
        { slug: "ok", addedAt: 3 },
        "junk",
        { slug: "" },
        { slug: "dup" },
        { slug: "ok" },
        { slug: "no-ts" },
      ])
    );
    expect(fav.getFavorites()).toEqual([
      { slug: "ok", addedAt: 3 },
      { slug: "dup", addedAt: 0 },
      { slug: "no-ts", addedAt: 0 },
    ]);
  });

  it("add：新增置顶 + 去重刷新时间戳", () => {
    fav.hydrateFavorites("[]");
    fav.addFavorite("a");
    fav.addFavorite("b");
    fav.addFavorite("a");
    const list = fav.getFavorites();
    expect(list.map(x => x.slug)).toEqual(["a", "b"]);
    expect(list[0].addedAt).toBeGreaterThanOrEqual(list[1].addedAt);
  });

  it("toggle：加 → true，删 → false", () => {
    fav.hydrateFavorites("[]");
    expect(fav.toggleFavorite("x")).toBe(true);
    expect(fav.isFavorite("x")).toBe(true);
    expect(fav.toggleFavorite("x")).toBe(false);
    expect(fav.getFavorites()).toEqual([]);
  });

  it("remove", () => {
    fav.hydrateFavorites("[]");
    fav.addFavorite("a");
    fav.removeFavorite("a");
    expect(fav.getFavorites()).toEqual([]);
  });

  it("容量上限：超出丢最旧", () => {
    fav.hydrateFavorites("[]");
    for (let i = 0; i < fav.FAVORITES_MAX + 5; i++) fav.addFavorite(`s${i}`);
    const list = fav.getFavorites();
    expect(list.length).toBe(fav.FAVORITES_MAX);
    expect(list[0].slug).toBe(`s${fav.FAVORITES_MAX + 4}`);
    expect(list.some(x => x.slug === "s0")).toBe(false);
  });

  it("订阅：add/remove 广播、退订后不再、空 slug 不广播", () => {
    fav.hydrateFavorites("[]");
    const seen: number[] = [];
    const off = fav.subscribeFavorites(v => seen.push(v.length));
    fav.addFavorite("a");
    fav.addFavorite(""); // 空 slug：不产生变更也不广播
    fav.removeFavorite("a");
    off();
    fav.toggleFavorite("b");
    expect(seen).toEqual([1, 0]);
  });

  it("水合幂等：二次水合不覆盖运行时状态", () => {
    fav.hydrateFavorites("[]");
    fav.addFavorite("keep");
    fav.hydrateFavorites(JSON.stringify([{ slug: "other", addedAt: 1 }]));
    expect(fav.getFavorites().map(x => x.slug)).toEqual(["keep"]);
  });
});
