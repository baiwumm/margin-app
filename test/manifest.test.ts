import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_BASE,
  checkForUpdate,
  currentBase,
  loadLocalManifest,
  resetManifestState,
} from "@/services/api/manifest";
import { resetMemoryCache } from "@/services/cache";
import { setPlatformAdapter } from "@/services/platform";
import type { Manifest } from "@/types/api";
import { MockPlatform } from "./helpers/mock-platform.ts";


let mp: MockPlatform;

function makeManifest(buildId: string): Manifest {
  return {
    schemaVersion: 1,
    buildId,
    generatedAt: "2026-09-29T00:00:00Z",
    assetBase: "https://www.baiwumm.com",
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

const MANIFEST_URL = `${DEFAULT_BASE}/api/v1/manifest.json`;

beforeEach(() => {
  mp = new MockPlatform();
  setPlatformAdapter(mp.adapter);
  resetMemoryCache();
  resetManifestState();
});

describe("manifest 流程（api-contract §7 启动三步）", () => {
  it("bootstrap：currentBase = DEFAULT_BASE；本地无 manifest → loadLocalManifest null", async () => {
    expect(currentBase()).toBe(DEFAULT_BASE);
    expect(await loadLocalManifest()).toBe(null);
  });

  it("200 → 存 manifest + etag；buildId 变 → 清旧 buildId 键", async () => {
    mp.storage.set("manifest", JSON.stringify(mp.envelope(makeManifest("bOld"))));
    mp.storage.set("api:site:bOld", "old-envelope");
    mp.json(MANIFEST_URL, mp.envelope(makeManifest("bNew")), '"etag-1"');

    const res = await checkForUpdate();
    expect(res).toMatchObject({ ok: true, changed: true, buildId: "bNew" });
    if ("evicted" in res) expect(res.evicted).toContain("api:site:bOld");
    expect(mp.storage.has("api:site:bOld")).toBe(false);
    expect(mp.storage.get("manifest:etag")).toBe('"etag-1"');
    // base 更新后仍指向同一 host
    expect(currentBase()).toBe("https://www.baiwumm.com");
  });

  it("304 → changed: false", async () => {
    // 先放本地 manifest + etag
    const m1 = makeManifest("b1");
    mp.storage.set(
      "manifest",
      JSON.stringify(mp.envelope(m1))
    );
    mp.storage.set("manifest:etag", '"etag-1"');
    mp.route(MANIFEST_URL, opts =>
      opts.header?.["If-None-Match"] === '"etag-1"'
        ? { statusCode: 304, data: "", header: {} }
        : { statusCode: 500, data: "", header: {} }
    );
    const res = await checkForUpdate();
    expect(res).toMatchObject({ ok: true, changed: false });
  });

  it("网络失败 → ok: false（继续用本地缓存，失败模式好）", async () => {
    mp.route(MANIFEST_URL, () => new Error("timeout"));
    const res = await checkForUpdate();
    expect(res).toEqual({ ok: false });
  });

  it("loadLocalManifest 从 storage 恢复（重启场景）", async () => {
    const m1 = makeManifest("b1");
    mp.storage.set("manifest", JSON.stringify(mp.envelope(m1)));
    const loaded = await loadLocalManifest();
    expect(loaded?.buildId).toBe("b1");
    expect(currentBase()).toBe("https://www.baiwumm.com");
  });
});
