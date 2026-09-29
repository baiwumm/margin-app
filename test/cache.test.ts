import { beforeEach, describe, expect, it } from "vitest";

import {
  BODY_CACHE_BUDGET_BYTES,
  SINGLE_ENTRY_DISK_LIMIT_BYTES,
  evictByBudget,
  evictStaleBuildIds,
  getWaterLevel,
  readCache,
  writeCache,
 resetMemoryCache } from "@/services/cache";
import { setPlatformAdapter } from "@/services/platform";
import { MockPlatform } from "./helpers/mock-platform.ts";

let mp: MockPlatform;

beforeEach(() => {
  mp = new MockPlatform();
  setPlatformAdapter(mp.adapter);
  resetMemoryCache();
});

const keyOf = (name: string, buildId: string) => `api:${name}:${buildId}`;

describe("cache 读写", () => {
  it("写读回环；内存层第二次读取", async () => {
    await writeCache(keyOf("site", "b1"), "hello");
    expect(await readCache(keyOf("site", "b1"))).toBe("hello");
    mp.storage.delete(keyOf("site", "b1")); // 清掉底层，内存层仍可读
    expect(await readCache(keyOf("site", "b1"))).toBe("hello");
  });

  it("单篇 >1MB 只留内存不落盘", async () => {
    const big = "x".repeat(SINGLE_ENTRY_DISK_LIMIT_BYTES + 1);
    await writeCache(keyOf("post-a", "b1"), big);
    expect(mp.storage.has(keyOf("post-a", "b1"))).toBe(false);
    expect(await readCache(keyOf("post-a", "b1"))).toBe(big);
  });

  it("protected 键（manifest/prefs/snapshot）直写不参与 LRU", async () => {
    await writeCache("prefs", "{}");
    await writeCache("snapshot", "{}");
    const lru = JSON.parse((await readCache("api:lru")) ?? "{}");
    expect(lru["prefs"]).toBeUndefined();
    expect(lru["snapshot"]).toBeUndefined();
  });
});

describe("cache LRU 字节预算（D30：4MB 按字节）", () => {
  it("超预算淘汰最旧访问的条目", async () => {
    const chunk = "x".repeat(1000);
    // 3 条 × 1000B，预算 2500B → 最旧的一条被淘汰
    await writeCache(keyOf("a", "b1"), chunk);
    await new Promise(r => setTimeout(r, 5));
    await writeCache(keyOf("b", "b1"), chunk);
    await new Promise(r => setTimeout(r, 5));
    await writeCache(keyOf("c", "b1"), chunk);
    await readCache(keyOf("a", "b1")); // touch a（a 变最新）
    await new Promise(r => setTimeout(r, 5));
    const evicted = await evictByBudget(2500);
    // b 最旧 → 被淘汰；a 因刚被 touch 保留
    expect(evicted).toEqual([keyOf("b", "b1")]);
    expect(await readCache(keyOf("a", "b1"))).toBe(chunk);
    expect(await readCache(keyOf("c", "b1"))).toBe(chunk);
  });

  it("写时自动触发水位淘汰（4MB 预算满了再写 1 条）", async () => {
    // 条目须 <1MB（超过只留内存不落盘，无法观察淘汰）；5×900KB = 4.4MB > 4MB
    const chunk = "x".repeat(900 * 1024);
    await writeCache(keyOf("a", "b1"), chunk);
    await writeCache(keyOf("b", "b1"), chunk);
    await writeCache(keyOf("c", "b1"), chunk);
    await writeCache(keyOf("d", "b1"), chunk);
    await writeCache(keyOf("e", "b1"), chunk); // 4.4MB > 4MB → 写入过程淘汰最旧的 a
    await writeCache(keyOf("f", "b1"), "small");
    expect(await readCache(keyOf("a", "b1"))).toBe(null);
    expect(await readCache(keyOf("b", "b1"))).toBe(chunk);
    expect(await readCache(keyOf("f", "b1"))).toBe("small");
    void BODY_CACHE_BUDGET_BYTES;
  });
});

describe("cache 水位守卫（读 getStorageInfo）", () => {
  it(">90% 停预取、>70% 触发淘汰建议", async () => {
    mp.limitSizeKb = 1000;
    mp.storage.set("k1", "x".repeat(950 * 1024)); // 950KB / 1000KB = 95%
    const level = await getWaterLevel();
    expect(level.ratio).toBeGreaterThan(0.9);
    expect(level.shouldPrefetch).toBe(false);
    expect(level.shouldEvict).toBe(true);
  });

  it("正常水位允许预取", async () => {
    mp.limitSizeKb = 10000;
    mp.storage.set("k1", "x".repeat(100 * 1024)); // 1%
    const level = await getWaterLevel();
    expect(level.shouldPrefetch).toBe(true);
    expect(level.shouldEvict).toBe(false);
  });
});

describe("cache buildId 失效清理", () => {
  it("删除旧 buildId 键，保留当前与 protected 键", async () => {
    mp.storage.set(keyOf("site", "bOld"), "old");
    mp.storage.set(keyOf("site", "bNew"), "new");
    mp.storage.set("manifest", "m");
    mp.storage.set("prefs", "p");
    mp.storage.set("snapshot", "s");
    const removed = await evictStaleBuildIds("bNew");
    expect(removed).toEqual([keyOf("site", "bOld")]);
    expect(mp.storage.has(keyOf("site", "bNew"))).toBe(true);
    expect(mp.storage.get("manifest")).toBe("m");
    expect(mp.storage.get("prefs")).toBe("p");
    expect(mp.storage.get("snapshot")).toBe("s");
  });
});
