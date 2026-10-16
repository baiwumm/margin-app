import { beforeEach, describe, expect, it } from "vitest";

import { setPlatformAdapter } from "@/services/platform";
import {
  KEY_PREFS,
  KEY_PREFS_SCHEMA,
  resetMemoryCache,
  readCache,
} from "@/services/cache";
import {
  DEFAULT_PREFS,
  PREFS_SCHEMA,
  clampBodyRpx,
  getPrefs,
  hydratePrefs,
  migrateLegacyPrefs,
  normalize,
  parsePrefs,
  prefsClass,
  serializePrefs,
  setPrefs,
  snapLeading,
  subscribePrefs,
  type Prefs,
} from "@/utils/prefs";
import { MockPlatform } from "./helpers/mock-platform.ts";

let mp: MockPlatform;

beforeEach(() => {
  mp = new MockPlatform();
  setPlatformAdapter(mp.adapter);
  resetMemoryCache();
  hydratePrefs(null);
});

/** setPrefs 的落盘是 fire-and-forget，排一个微任务再断言 */
const flush = () => new Promise(r => setTimeout(r, 0));

describe("字号 / 行距钳制", () => {
  it("区间 26–40 且吸附到 2rpx 步进（requirements §10）", () => {
    expect(clampBodyRpx(26)).toBe(26);
    expect(clampBodyRpx(40)).toBe(40);
    expect(clampBodyRpx(27)).toBe(28);
    expect(clampBodyRpx(31)).toBe(32);
    expect(clampBodyRpx(10)).toBe(26);
    expect(clampBodyRpx(99)).toBe(40);
  });

  it("非数值回落默认 32rpx（margin 正文 16px@375）", () => {
    expect(clampBodyRpx(undefined)).toBe(32);
    expect(clampBodyRpx(Number.NaN)).toBe(32);
    expect(clampBodyRpx("30" as unknown)).toBe(32);
  });

  it("行距吸附到三档最近值", () => {
    expect(snapLeading(1.5)).toBe(1.6);
    expect(snapLeading(1.7)).toBe(1.75);
    expect(snapLeading(2.4)).toBe(1.9);
    expect(snapLeading(null)).toBe(1.75);
  });
});

describe("解析与校验", () => {
  it("空/坏 JSON/非对象 → 全默认", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{oops")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("[1,2]")).toEqual(DEFAULT_PREFS);
  });

  it("序列化回环保真", () => {
    const p: Prefs = {
      theme: "dark",
      accent: "rose",
      bodyRpx: 34,
      leading: 1.9,
      readMode: true,
      codeWrap: true,
      siteFont: true,
    };
    expect(parsePrefs(serializePrefs(p))).toEqual(p);
  });

  it("未知枚举值与脏布尔一律回落（存储可能被旧版写坏）", () => {
    const n = normalize({
      theme: "neon",
      accent: "chartreuse",
      readMode: "yes",
      codeWrap: 1,
      siteFont: "yes",
    });
    expect(n.theme).toBe("system");
    expect(n.accent).toBe("blue");
    expect(n.readMode).toBe(false);
    expect(n.codeWrap).toBe(false);
    expect(n.siteFont).toBe(false);
  });
});

describe("生效类名", () => {
  it("字号/行距映射到 tokens.css 的构建期类", () => {
    expect(prefsClass(DEFAULT_PREFS)).toBe("fs-32 lead-base");
    expect(prefsClass({ ...DEFAULT_PREFS, bodyRpx: 26, leading: 1.6 })).toBe(
      "fs-26 lead-tight"
    );
    expect(prefsClass({ ...DEFAULT_PREFS, bodyRpx: 40, leading: 1.9 })).toBe(
      "fs-40 lead-loose"
    );
  });
});

describe("运行时单例与落盘", () => {
  it("hydrate 只改内存、不写存储", async () => {
    hydratePrefs(serializePrefs({ ...DEFAULT_PREFS, accent: "green" }));
    expect(getPrefs().accent).toBe("green");
    await flush();
    expect(mp.storage.has("prefs")).toBe(false);
  });

  it("setPrefs 钳制 + 通知订阅者 + 写 prefs 键", async () => {
    const seen: number[] = [];
    const off = subscribePrefs(p => seen.push(p.bodyRpx));
    setPrefs({ bodyRpx: 99 });
    expect(getPrefs().bodyRpx).toBe(40);
    expect(seen).toEqual([40]);
    await flush();
    expect(JSON.parse((await readCache("prefs")) ?? "{}")).toMatchObject({ bodyRpx: 40 });
    off();
    setPrefs({ bodyRpx: 26 });
    expect(seen).toEqual([40]); // 取消订阅后不再收通知
  });

  it("siteFont：默认 true；写坏值判 false；显式关可持续", () => {
    expect(DEFAULT_PREFS.siteFont).toBe(true);
    // 存储里没这字段（老版本写入）⇒ 回落新默认 true
    expect(normalize({}).siteFont).toBe(true);
    expect(normalize({ siteFont: undefined }).siteFont).toBe(true);
    // 写坏的脏值仍一律判 false
    expect(normalize({ siteFont: "yes" }).siteFont).toBe(false);
    setPrefs({ siteFont: true });
    expect(getPrefs().siteFont).toBe(true);
    // 落盘 round-trip 后显式关不被默认翻回来
    setPrefs({ siteFont: false });
    expect(parsePrefs(serializePrefs(getPrefs())).siteFont).toBe(false);
  });
});

describe("一次性迁移（D75：siteFont 默认反转）", () => {
  it("旧存储的 siteFont:false 被拉回新默认 true，其余字段不动", () => {
    // 旧版任何一次偏好改动都会 serializePrefs 写全量字段 ⇒ 老盘上必有 false
    const legacy = serializePrefs({
      ...DEFAULT_PREFS,
      theme: "dark",
      bodyRpx: 36,
      siteFont: false,
    });
    const migrated = parsePrefs(migrateLegacyPrefs(legacy));
    expect(migrated.siteFont).toBe(true);
    expect(migrated.theme).toBe("dark");
    expect(migrated.bodyRpx).toBe(36);
  });

  it("脏存储/空存储迁移后不炸、回落新默认", () => {
    expect(parsePrefs(migrateLegacyPrefs("{oops")).siteFont).toBe(true);
    expect(parsePrefs(migrateLegacyPrefs(null)).siteFont).toBe(true);
  });

  it("迁移幂等：迁完再迁一次值不变", () => {
    const once = migrateLegacyPrefs(serializePrefs({ ...DEFAULT_PREFS, siteFont: false }));
    expect(parsePrefs(migrateLegacyPrefs(once))).toEqual(parsePrefs(once));
  });

  it("PREFS_SCHEMA 戳存在且与 prefs 键分开", () => {
    expect(PREFS_SCHEMA).toBeGreaterThan(1);
    expect(KEY_PREFS_SCHEMA).not.toBe(KEY_PREFS);
  });
});
