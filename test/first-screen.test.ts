import { beforeEach, describe, expect, it } from "vitest";

import {
  getPostsIndex,
  getSite,
  warmFirstScreen,
} from "@/services/api/collections";
import {
  DEFAULT_BASE,
  checkForUpdate,
  resetManifestState,
} from "@/services/api/manifest";
import { readCache, resetMemoryCache } from "@/services/cache";
import { resetRequestMemo } from "@/services/request";
import { setPlatformAdapter } from "@/services/platform";
import type { Manifest, PostMeta, SitePayload } from "@/types/api";
import { MockPlatform } from "./helpers/mock-platform";

/**
 * M3 步 9a（D50）：首屏 site/index 与 manifest 并发的缓存三态回归。
 * 三态 = 无缓存（冷启动）/ 命中（热缓存）/ buildId 变更驱逐；
 * 另覆盖 warm 的静默失败、memo 挡第二发、订阅与预热共用同一发。
 */
let mp: MockPlatform;

const SITE_URL = `${DEFAULT_BASE}/api/v1/site.json`;
const POSTS_URL = `${DEFAULT_BASE}/api/v1/posts/index.json`;
const MANIFEST_URL = `${DEFAULT_BASE}/api/v1/manifest.json`;

const sitePayload: SitePayload = {
  title: "Margin",
  desc: "边白",
  author: "白雾茫茫丶",
  avatar: "https://www.baiwumm.com/avatar.png",
  socials: [],
  nav: [],
  hero: "",
  announcement: null,
  theme: { accent: "#b56007", accentDark: "#f59e0b" },
};
const postsPayload: PostMeta[] = [
  {
    slug: "a1",
    path: "/posts/a1",
    title: "篇一",
    pubDatetime: "2026-09-01T00:00:00Z",
    description: "d",
    tags: [],
    modDatetime: null,
    featured: false,
    draft: false,
    ogImage: null,
    readingTime: 1,
    wordCount: 10,
  },
];

function makeManifest(buildId: string): Manifest {
  return {
    schemaVersion: 1,
    buildId,
    generatedAt: "2026-09-29T00:00:00Z",
    assetBase: DEFAULT_BASE,
    site: { title: "Margin", author: "白雾茫茫丶", desc: "边白" },
    counts: { posts: 74, galleries: 3, moments: 9, tags: 62, images: 246 },
    resources: [],
    searchIndex: {
      titlesPath: "/api/v1/search/titles.json",
      titlesHash: "h1",
      termsPath: "/api/v1/search/terms.json",
      termsHash: "h2",
      termsMinChars: 2,
      strategy: "bigram",
    },
  };
}

/** 等 fire-and-forget 的取数链落定（storage 读 + 请求 + 缓存写都是异步） */
const flush = () => new Promise(r => setTimeout(r, 20));

beforeEach(() => {
  mp = new MockPlatform();
  setPlatformAdapter(mp.adapter);
  resetMemoryCache();
  resetManifestState();
  resetRequestMemo();
});

describe("warmFirstScreen（D50 首屏预热）", () => {
  it("无 manifest 也能取数：两发请求 + 写键用信封自带 buildId", async () => {
    mp.json(SITE_URL, mp.envelope(sitePayload, "bW"));
    mp.json(POSTS_URL, mp.envelope(postsPayload, "bW"));

    await warmFirstScreen();

    expect(mp.requestLog).toEqual([SITE_URL, POSTS_URL]);
    expect(await readCache("api:site:bW")).toBe(
      JSON.stringify(mp.envelope(sitePayload, "bW"))
    );
    expect(await readCache("api:posts-index:bW")).toBeTruthy();
  });

  it("网络失败静默：不抛、不写键（订阅侧自会重取）", async () => {
    mp.route(SITE_URL, () => new Error("down"));
    mp.route(POSTS_URL, () => new Error("down"));

    await expect(warmFirstScreen()).resolves.toBeUndefined();

    expect(await readCache("api:site:bW")).toBe(null);
    expect(await readCache("api:posts-index:bW")).toBe(null);
  });
});

describe("缓存三态回归（loadWithCache 原语义不变）", () => {
  it("无缓存（冷启动）：预热与订阅并发 ⇒ 每资源只 1 发，数据经同一发到达", async () => {
    mp.json(SITE_URL, mp.envelope(sitePayload, "b1"));
    mp.json(POSTS_URL, mp.envelope(postsPayload, "b1"));

    const warm = warmFirstScreen(); // 不等它完成 = 与 manifest 并发的那一刻
    const seenSite: SitePayload[] = [];
    const seenPosts: PostMeta[][] = [];
    getSite("b1", d => seenSite.push(d)); // manifest 回来后 UI 才订阅
    getPostsIndex("b1", d => seenPosts.push(d));
    await warm;
    await flush();

    expect(seenSite).toEqual([sitePayload]);
    expect(seenPosts).toEqual([postsPayload]);
    // 预热一发 + 订阅零发（飞行中去重接上同一发）
    expect(mp.requestLog.filter(u => u === SITE_URL)).toHaveLength(1);
    expect(mp.requestLog.filter(u => u === POSTS_URL)).toHaveLength(1);
    expect(await readCache("api:site:b1")).toBeTruthy();
  });

  it("命中（热缓存）：先渲染缓存再 SWR 补一发，且与预热共用同一发", async () => {
    mp.storage.set(
      "api:site:b1",
      JSON.stringify(mp.envelope(sitePayload, "b1"))
    );
    mp.json(SITE_URL, mp.envelope(sitePayload, "b1"));

    const warm = warmFirstScreen();
    const seen: SitePayload[] = [];
    getSite("b1", d => seen.push(d));
    await warm;
    await flush();

    expect(seen[0]).toEqual(sitePayload); // 缓存先到（0 等待渲染）
    expect(seen[seen.length - 1]).toEqual(sitePayload); // SWR 后到（数据相同）
    expect(mp.requestLog.filter(u => u === SITE_URL)).toHaveLength(1);
  });

  it("预热完成后再订阅：memo 挡住第二发（冷启动白等消失的那条路径）", async () => {
    mp.json(SITE_URL, mp.envelope(sitePayload, "b1"));

    await warmFirstScreen(); // 先完成（manifest 比 site 慢的那个世界线）
    const seen: SitePayload[] = [];
    getSite("b1", d => seen.push(d));
    await flush();

    expect(seen[seen.length - 1]).toEqual(sitePayload);
    expect(mp.requestLog.filter(u => u === SITE_URL)).toHaveLength(1);
  });

  it("buildId 变更驱逐：旧键清、新键写、订阅从新键渲染", async () => {
    mp.storage.set(
      "manifest",
      JSON.stringify(mp.envelope(makeManifest("bOld")))
    );
    mp.storage.set(
      "api:site:bOld",
      JSON.stringify(mp.envelope(sitePayload, "bOld"))
    );
    mp.json(MANIFEST_URL, mp.envelope(makeManifest("bNew")), '"e2"');
    mp.json(SITE_URL, mp.envelope(sitePayload, "bNew"));

    const res = await checkForUpdate();
    expect(res).toMatchObject({ ok: true, changed: true, buildId: "bNew" });
    expect(await readCache("api:site:bOld")).toBe(null); // 旧 buildId 键已清

    const seen: SitePayload[] = [];
    getSite("bNew", d => seen.push(d));
    await flush();

    expect(seen[seen.length - 1]).toEqual(sitePayload);
    expect(await readCache("api:site:bNew")).toBeTruthy();
  });
});
